# How to Add Your Company Logo

## Quick Instructions

1. **Save your logo file** as `logo.png` or `logo.svg` in this folder (`public/`)
   - Recommended size: 200x200 pixels or larger
   - Transparent background recommended
   - Square or horizontal orientation works best

2. **Update the App.tsx file** to use your logo:
   
   Find this code in `src/App.tsx`:
   ```tsx
   <div className="logo-placeholder">L</div>
   ```
   
   Replace it with:
   ```tsx
   <img src="/logo.png" alt="Lenama Logo" />
   ```
   
   Or if you're using SVG:
   ```tsx
   <img src="/logo.svg" alt="Lenama Logo" />
   ```

## File Formats Supported
- PNG (recommended for photos/complex logos)
- SVG (recommended for simple logos - scalable)
- JPG/JPEG (works but not recommended)
- WebP (modern format, great quality)

## Tips
- Use a transparent background (PNG or SVG) for best results
- Logo will automatically scale to 40x40 pixels
- For best quality, use at least 80x80 pixels (2x for retina displays)
- Keep file size under 100KB for fast loading

## Current Status
✅ Logo placeholder (blue "L") is currently displayed
📝 Ready to replace with your actual logo file
