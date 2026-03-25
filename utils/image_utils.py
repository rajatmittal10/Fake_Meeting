"""
FakeMeeting - Image Utilities
=============================
Uses Pillow to:
  - Resize uploaded photos to a consistent square
  - Centre-crop to maintain aspect ratio
  - Save as JPEG for uniform format
"""

from PIL import Image, ImageOps
import io

AVATAR_SIZE = (400, 400)   # square px


def process_avatar(file_storage, save_path: str) -> None:
    """
    Read an uploaded FileStorage object, square-crop and resize it,
    then save as JPEG to save_path.
    """
    raw = file_storage.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")

    # Centre-crop to square
    img = ImageOps.fit(img, AVATAR_SIZE, method=Image.LANCZOS, centering=(0.5, 0.5))

    img.save(save_path, "JPEG", quality=88, optimize=True)
