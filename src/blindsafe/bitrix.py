from __future__ import annotations

from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
import re
import unicodedata

import requests


class BitrixDiskError(RuntimeError):
    pass


class BitrixDiskClient:
    def __init__(self, webhook_url: str, timeout: int = 30) -> None:
        self.webhook_url = webhook_url.rstrip("/")
        self.timeout = timeout

    def _method_url(self, method_name: str) -> str:
        return f"{self.webhook_url}/{method_name}"

    def _call(self, method_name: str, payload: dict) -> dict:
        response = requests.post(
            self._method_url(method_name),
            json=payload,
            timeout=self.timeout,
        )

        try:
            data = response.json()
        except ValueError as error:
            response.raise_for_status()
            raise BitrixDiskError("Resposta invalida do Bitrix.") from error

        if response.status_code >= 400:
            message = data.get("error_description") or data.get("error") or response.text
            raise BitrixDiskError(message)

        if "error" in data:
            raise BitrixDiskError(data.get("error_description") or data["error"])

        return data["result"]

    def list_folder_children(self, folder_id: str) -> list[dict]:
        items: list[dict] = []
        start = 0

        while True:
            result = self._call("disk.folder.getchildren", {"id": int(folder_id), "start": start})
            if not result:
                break
            items.extend(result)
            if len(result) < 50:
                break
            start += 50

        return items

    def get_file(self, file_id: str) -> dict:
        return self._call("disk.file.get", {"id": int(file_id)})

    def get_folder(self, folder_id: str) -> dict:
        return self._call("disk.folder.get", {"id": int(folder_id)})

    def list_storages(self) -> list[dict]:
        items: list[dict] = []
        start = 0

        while True:
            result = self._call("disk.storage.getlist", {"start": start})
            if not result:
                break

            if isinstance(result, list):
                chunk = result
            elif isinstance(result, dict):
                chunk = result.get("items") or result.get("ITEMS") or []
            else:
                chunk = []

            if not chunk:
                break

            items.extend(chunk)
            if len(chunk) < 50:
                break
            start += 50

        return items

    def _normalize_name(self, value: str) -> str:
        # Remove acentos, normaliza caixa e espaços para comparar nomes de forma robusta.
        normalized = unicodedata.normalize("NFKD", value)
        normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        normalized = normalized.casefold().strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized

    def _name_without_extension(self, file_name: str) -> str:
        return Path(file_name).stem

    def _item_updated_at(self, item: dict) -> tuple[int, int]:
        raw = (
            item.get("UPDATE_TIME")
            or item.get("CREATE_TIME")
            or item.get("TIMESTAMP_X")
            or ""
        )
        raw = str(raw).strip()
        if raw.endswith("Z"):
            raw = f"{raw[:-1]}+00:00"

        ts = 0
        if raw:
            try:
                ts = int(datetime.fromisoformat(raw).timestamp())
            except ValueError:
                ts = 0

        try:
            item_id = int(item.get("ID", 0))
        except (TypeError, ValueError):
            item_id = 0

        return ts, item_id

    def _pick_newest(self, items: list[dict]) -> dict:
        if not items:
            raise BitrixDiskError("Nenhum arquivo candidato encontrado no Bitrix.")
        return max(items, key=self._item_updated_at)

    def _format_item(self, item: dict) -> str:
        name = str(item.get("NAME", "?"))
        item_id = str(item.get("ID", "?"))
        updated = str(item.get("UPDATE_TIME") or item.get("CREATE_TIME") or "?")
        return f"{name} (ID={item_id}, UPDATE_TIME={updated})"

    def _format_folder(self, item: dict, path_hint: str = "") -> str:
        name = str(item.get("NAME", "?"))
        item_id = str(item.get("ID", "?"))
        return f"{name} (ID={item_id}{', PATH=' + path_hint if path_hint else ''})"

    def _root_folder_ids(self) -> list[str]:
        storages = self.list_storages()
        roots: list[str] = []
        for st in storages:
            raw = st.get("ROOT_OBJECT_ID") or st.get("rootObjectId") or st.get("root_object_id")
            if raw is None:
                continue
            roots.append(str(raw))

        if not roots:
            raise BitrixDiskError(
                "Nao foi possivel obter pastas raiz via disk.storage.getlist. "
                "Configure um ID numerico de pasta ou valide permissao de Disk no webhook."
            )

        # Remove duplicados mantendo ordem.
        seen: set[str] = set()
        unique_roots: list[str] = []
        for rid in roots:
            if rid in seen:
                continue
            seen.add(rid)
            unique_roots.append(rid)
        return unique_roots

    def _find_direct_child_folders(self, parent_folder_id: str, folder_name: str) -> list[dict]:
        target = self._normalize_name(folder_name)
        children = self.list_folder_children(parent_folder_id)
        return [
            item
            for item in children
            if item.get("TYPE") == "folder"
            and self._normalize_name(str(item.get("NAME", ""))) == target
        ]

    def _split_folder_path(self, folder_path: str) -> list[str]:
        chunks = re.split(r"[\\/]+", folder_path.strip())
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    def _find_folder_by_path(self, folder_path: str) -> dict:
        parts = self._split_folder_path(folder_path)
        if not parts:
            raise BitrixDiskError("Caminho de pasta vazio para resolucao no Bitrix.")

        roots = self._root_folder_ids()
        candidates: list[tuple[dict, str]] = []

        for root_id in roots:
            current_ids = [root_id]
            path_ok = True
            built_parts: list[str] = []

            for part in parts:
                next_ids: list[str] = []
                for current_id in current_ids:
                    matches = self._find_direct_child_folders(current_id, part)
                    if len(matches) > 1:
                        detail = "\n - ".join(self._format_folder(item, "/".join(built_parts + [part])) for item in matches)
                        raise BitrixDiskError(
                            "Ambiguidade no Bitrix: mais de uma pasta com o mesmo nome no mesmo nivel. "
                            "A automacao foi interrompida para evitar pasta incorreta.\n"
                            f"Trecho: {'/'.join(built_parts + [part])}\n"
                            f"Candidatas:\n - {detail}"
                        )
                    if len(matches) == 1:
                        next_ids.append(str(matches[0].get("ID")))

                if not next_ids:
                    path_ok = False
                    break

                current_ids = next_ids
                built_parts.append(part)

            if path_ok and current_ids:
                for folder_id in current_ids:
                    folder = self.get_folder(folder_id)
                    candidates.append((folder, "/".join(parts)))

        if not candidates:
            raise BitrixDiskError(
                "Pasta nao encontrada por caminho no Bitrix. "
                "Verifique o valor configurado em path:.\n"
                f"Caminho: {folder_path}"
            )

        if len(candidates) > 1:
            detail = "\n - ".join(self._format_folder(item, path_hint) for item, path_hint in candidates)
            raise BitrixDiskError(
                "Ambiguidade no Bitrix: o caminho informado existe em mais de um storage. "
                "A automacao foi interrompida para evitar pasta incorreta.\n"
                f"Caminho: {folder_path}\n"
                f"Candidatas:\n - {detail}"
            )

        return candidates[0][0]

    def _find_folder_by_name(self, folder_name: str, max_depth: int = 6) -> dict:
        target = self._normalize_name(folder_name)
        roots = self._root_folder_ids()

        matches: list[tuple[dict, str]] = []
        visited: set[str] = set()

        for root_id in roots:
            queue: list[tuple[str, list[str], int]] = [(root_id, [], 0)]

            while queue:
                current_id, parts, depth = queue.pop(0)
                if current_id in visited:
                    continue
                visited.add(current_id)

                try:
                    children = self.list_folder_children(current_id)
                except BitrixDiskError:
                    continue

                for item in children:
                    if item.get("TYPE") != "folder":
                        continue

                    folder_name_item = str(item.get("NAME", ""))
                    folder_id_item = str(item.get("ID", ""))
                    item_path = parts + [folder_name_item]

                    if self._normalize_name(folder_name_item) == target:
                        matches.append((item, "/".join(item_path)))

                    if depth + 1 < max_depth and folder_id_item:
                        queue.append((folder_id_item, item_path, depth + 1))

        if not matches:
            raise BitrixDiskError(
                "Pasta nao encontrada por nome no Bitrix. "
                "Use um ID numerico, path:... ou ajuste o nome configurado.\n"
                f"Nome: {folder_name}"
            )

        if len(matches) > 1:
            detail = "\n - ".join(self._format_folder(item, path_hint) for item, path_hint in matches[:10])
            more = "" if len(matches) <= 10 else f"\n... e mais {len(matches) - 10} pasta(s)."
            raise BitrixDiskError(
                "Ambiguidade no Bitrix: existe mais de uma pasta com esse nome. "
                "A automacao foi interrompida para evitar pasta incorreta.\n"
                f"Nome: {folder_name}\n"
                f"Candidatas:\n - {detail}{more}"
            )

        return matches[0][0]

    def resolve_folder_id(self, folder_ref: str) -> str:
        ref = folder_ref.strip()
        if not ref:
            raise BitrixDiskError("Referencia de pasta vazia.")

        # Formatos aceitos:
        # - "123" (ID numerico)
        # - "name:Modelos Contratos"
        # - "path:Modelos/Contratos"
        if ref.isdigit():
            folder = self.get_folder(ref)
            folder_id = folder.get("ID")
            if folder_id is None:
                raise BitrixDiskError(f"Pasta invalida para ID informado: {ref}")
            return str(folder_id)

        lower = ref.casefold()
        if lower.startswith("path:"):
            folder = self._find_folder_by_path(ref[5:].strip())
            return str(folder.get("ID"))
        if lower.startswith("name:"):
            folder = self._find_folder_by_name(ref[5:].strip())
            return str(folder.get("ID"))

        # Compatibilidade: valor textual sem prefixo eh tratado como nome exato.
        folder = self._find_folder_by_name(ref)
        return str(folder.get("ID"))

    def _closest_file_names(self, files: list[dict], expected_names: list[str], limit: int = 5) -> list[str]:
        scored: list[tuple[float, str]] = []
        expected_norm = [self._normalize_name(name) for name in expected_names]
        for item in files:
            item_name = str(item.get("NAME", ""))
            item_norm = self._normalize_name(item_name)
            score = 0.0
            for candidate in expected_norm:
                ratio = SequenceMatcher(None, candidate, item_norm).ratio()
                if ratio > score:
                    score = ratio
            scored.append((score, item_name))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [name for _, name in scored[:limit] if name]

    def find_file_by_name(self, folder_id: str, file_names: list[str]) -> dict:
        if not file_names:
            raise BitrixDiskError("Lista de nomes de arquivo vazia.")

        normalized_full_names = {
            self._normalize_name(name.strip()) for name in file_names if name.strip()
        }
        if not normalized_full_names:
            raise BitrixDiskError("Lista de nomes de arquivo invalida.")

        normalized_stems = {
            self._normalize_name(self._name_without_extension(name.strip()))
            for name in file_names
            if name.strip()
        }

        children = self.list_folder_children(folder_id)
        files = [item for item in children if item.get("TYPE") == "file"]

        # Busca estrita: nunca escolhe por similaridade para evitar falso-positivo.
        # 1) Nome completo normalizado (ignora acentos/caixa/espaços).
        exact_name_matches = [
            item
            for item in files
            if self._normalize_name(str(item.get("NAME", ""))) in normalized_full_names
        ]
        if len(exact_name_matches) == 1:
            return self._pick_newest(exact_name_matches)
        if len(exact_name_matches) > 1:
            detail = "\n - ".join(self._format_item(item) for item in exact_name_matches)
            raise BitrixDiskError(
                "Ambiguidade no Bitrix: mais de um arquivo com nome esperado. "
                "A automacao foi interrompida para evitar baixar documento incorreto.\n"
                f"Pasta: {folder_id}\n"
                f"Esperados: {', '.join(file_names)}\n"
                f"Candidatos:\n - {detail}"
            )

        # 2) Nome sem extensao normalizado.
        stem_matches = [
            item
            for item in files
            if self._normalize_name(self._name_without_extension(str(item.get("NAME", ""))))
            in normalized_stems
        ]
        if len(stem_matches) == 1:
            return self._pick_newest(stem_matches)
        if len(stem_matches) > 1:
            detail = "\n - ".join(self._format_item(item) for item in stem_matches)
            raise BitrixDiskError(
                "Ambiguidade no Bitrix: mais de um arquivo bate com o nome base esperado. "
                "A automacao foi interrompida para evitar baixar documento incorreto.\n"
                f"Pasta: {folder_id}\n"
                f"Esperados: {', '.join(file_names)}\n"
                f"Candidatos:\n - {detail}"
            )

        close_names = self._closest_file_names(files, file_names)
        maybe = f"\nNomes parecidos encontrados: {', '.join(close_names)}" if close_names else ""

        raise BitrixDiskError(
            "Arquivo esperado nao encontrado de forma estrita no Bitrix. "
            "A automacao foi interrompida para evitar documento incorreto.\n"
            f"Pasta: {folder_id}\n"
            f"Esperados: {', '.join(file_names)}"
            f"{maybe}"
        )

    def download_file(self, download_url: str, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with requests.get(download_url, stream=True, timeout=self.timeout) as response:
            response.raise_for_status()
            with destination.open("wb") as file_obj:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        file_obj.write(chunk)
        return destination

    def download_file_from_folder(
        self,
        folder_id: str,
        file_names: list[str],
        destination: Path,
    ) -> Path:
        file_info = self.find_file_by_name(folder_id, file_names)
        download_url = file_info.get("DOWNLOAD_URL")
        if not download_url:
            file_details = self.get_file(file_info["ID"])
            download_url = file_details.get("DOWNLOAD_URL")

        if not download_url:
            raise BitrixDiskError("O Bitrix nao retornou uma URL de download para o arquivo.")

        return self.download_file(download_url, destination)
