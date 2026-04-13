

## Plan: Fix QR Download & Add QR Scanner to Dashboard

### Problem Analysis

1. **Download bug**: The hidden QR canvas (`#hidden-qr-canvas`) uses `className="hidden"` which applies `display: none`. This prevents the `QRCodeCanvas` from rendering actual pixels, so when the download function queries for the canvas element, it gets an empty/non-rendered canvas — resulting in a blank QR area in the downloaded image.

2. **Dashboard join by QR**: Currently the `JoinByCodeDialog` only supports manual 6-character code entry. Users cannot scan a QR code to join a project from the Dashboard.

---

### Changes

**File 1: `src/components/ShareSettingsCard.tsx`**
- Fix the hidden QR canvas: change `className="hidden"` to `className="absolute -left-[9999px]"` (off-screen but still rendered) so the canvas pixels are available for the download function
- This ensures `document.querySelector('#hidden-qr-canvas canvas')` returns a fully rendered canvas

**File 2: `src/components/JoinByCodeDialog.tsx`**
- Add a "Scan QR" tab/button alongside the manual code entry screen
- Integrate the device camera using the browser `navigator.mediaDevices.getUserMedia` API and the `jsQR` library (or `html5-qrcode`) to scan QR codes
- When a QR code is detected with the pattern `t-nexus.io.vn/join?code=XXXXXX`, auto-fill the 6-digit code and trigger the lookup
- Add a toggle between "Nhập mã" (manual) and "Quét QR" (camera) modes
- Handle camera permission errors gracefully

**File 3: `package.json`**
- Add `html5-qrcode` dependency for reliable QR scanning from camera

---

### Technical Details

- The `html5-qrcode` library handles camera access, video stream management, and QR decoding in one package — no need to manually manage `getUserMedia` or parse QR frames
- The QR scanner will parse the URL from the scanned code, extract the `code` query parameter, and auto-fill + auto-lookup
- Camera stream will be properly cleaned up when the dialog closes or user switches back to manual mode

