"""Gera blindsafe_icon.png e blindsafe_icon.ico com o logo BLINDSAFE."""
from PIL import Image, ImageDraw, ImageFont
import os, sys

# ── Cores ─────────────────────────────────────────────────────────────────────
NAVY   = (29,  52,  97)
COPPER = (178, 111, 54)
WHITE  = (255, 255, 255)

W, H = 512, 512

def load_font(path, size):
    return ImageFont.truetype(path, size)

SERIF_BOLD  = "C:/Windows/Fonts/georgiab.ttf"
SANS_BOLD   = "C:/Windows/Fonts/calibrib.ttf"
SANS_REG    = "C:/Windows/Fonts/calibri.ttf"

def make_png(path="blindsafe_icon.png"):
    img  = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    # ── letras BS ──────────────────────────────────────────────────────────────
    fB = load_font(SERIF_BOLD, 310)
    fS = load_font(SERIF_BOLD, 310)

    # Mede cada letra
    bbB = draw.textbbox((0, 0), "B", font=fB)
    bbS = draw.textbbox((0, 0), "S", font=fS)
    wB  = bbB[2] - bbB[0]
    wS  = bbS[2] - bbS[0]
    hLetter = bbB[3] - bbB[1]

    # Centraliza o par BS com sobreposição de ~30px
    overlap = 28
    total   = wB + wS - overlap
    xB = (W - total) // 2
    xS = xB + wB - overlap
    yLetters = 30

    # S primeiro (atrás) em COPPER mais claro para a sobreposição ficar bonita
    draw.text((xS, yLetters), "S", font=fS, fill=COPPER)
    # B por cima em NAVY
    draw.text((xB, yLetters), "B", font=fB, fill=NAVY)

    # ── BLINDSAFE ─────────────────────────────────────────────────────────────
    fTitle = load_font(SANS_BOLD, 54)
    draw.text((W // 2, 370), "BLINDSAFE", font=fTitle, fill=NAVY, anchor="mm")

    # ── Linha decorativa + subtítulo ──────────────────────────────────────────
    fSub = load_font(SANS_REG, 26)
    y_sub   = 425
    txt_sub = "SOLUÇÕES FINANCEIRAS"
    bbSub   = draw.textbbox((0, 0), txt_sub, font=fSub)
    tw      = bbSub[2] - bbSub[0]

    cx = W // 2
    gap = 14   # espaço entre linha e texto
    line_len = 70
    draw.line([(cx - tw//2 - gap - line_len, y_sub),
               (cx - tw//2 - gap,            y_sub)], fill=COPPER, width=2)
    draw.line([(cx + tw//2 + gap,            y_sub),
               (cx + tw//2 + gap + line_len, y_sub)], fill=COPPER, width=2)
    draw.text((cx, y_sub), txt_sub, font=fSub, fill=COPPER, anchor="mm")

    img.save(path)
    print(f"Salvo: {path}")
    return img

def make_ico(png_path="blindsafe_icon.png", ico_path="blindsafe_icon.ico"):
    base = Image.open(png_path).convert("RGBA")
    sizes = [256, 128, 64, 48, 32, 16]
    icons = [base.resize((s, s), Image.LANCZOS) for s in sizes]
    icons[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes],
                  append_images=icons[1:])
    print(f"Salvo: {ico_path}")

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    png = os.path.join(out_dir, "blindsafe_icon.png")
    ico = os.path.join(out_dir, "blindsafe_icon.ico")
    make_png(png)
    make_ico(png, ico)
    print("Concluído.")
