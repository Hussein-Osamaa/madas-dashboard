import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

type ScanMode = 'order' | 'return';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string, mode: ScanMode) => Promise<void>;
  submitting?: boolean;
};

// Get scan config - responsive for better barcode scanning
const getScanConfig = (): Html5QrcodeCameraScanConfig => {
  if (typeof window === 'undefined') {
    return {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    };
  }
  
  // Calculate based on viewport for better scanning
  const width = window.innerWidth;
  let qrboxSize = 250; // default
  
  if (width < 640) {
    // Mobile: use larger box for better barcode scanning
    qrboxSize = 280;
  } else if (width < 1024) {
    // Tablet
    qrboxSize = 300;
  } else {
    // Desktop
    qrboxSize = 350;
  }
  
  return {
    fps: 10,
    qrbox: { width: qrboxSize, height: qrboxSize }
  };
};

const ScanBarcodeModal = ({ open, onClose, onScan, submitting }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const modeRef = useRef<ScanMode>('order');
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [mode, setMode] = useState<ScanMode>('order');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (qrCodeRef.current && isScannerRunningRef.current) {
        qrCodeRef.current
          .stop()
          .then(() => {
            isScannerRunningRef.current = false;
            try {
              qrCodeRef.current?.clear();
            } catch {
              // Ignore clear errors
            }
          })
          .catch((stopError) => {
            // Ignore "scanner is not running" errors
            const errorMessage = stopError?.message || String(stopError);
            if (!errorMessage.toLowerCase().includes('not running') && !errorMessage.toLowerCase().includes('not paused')) {
              console.error('[ScanBarcodeModal] Failed to stop scanner', stopError);
            }
            isScannerRunningRef.current = false;
          });
        qrCodeRef.current = null;
      }
      setManualBarcode('');
      setError(null);
      setSuccessMessage(null);
      setScannedBarcode(null);
      setMode('order');
      isScannerRunningRef.current = false;
      return;
    }

    let isMounted = true;
    const init = async () => {
      if (!containerRef.current) return;
      try {
        qrCodeRef.current = new Html5Qrcode(containerRef.current.id);
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        const preferredCamera =
          cameras.find((camera) =>
            camera.label.toLowerCase().includes('back') ||
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          ) ?? cameras[0];

        const scanConfig = getScanConfig();
        await qrCodeRef.current.start(
          preferredCamera.id,
          scanConfig,
          (decodedText) => {
            // Just capture the barcode, don't process it automatically
            const trimmed = decodedText.trim();
            if (trimmed) {
              setManualBarcode(trimmed);
              setScannedBarcode(trimmed);
              setError(null);
              // Clear scanned indicator after 3 seconds
              setTimeout(() => {
                setScannedBarcode(null);
              }, 3000);
            }
          },
          undefined
        );
        isScannerRunningRef.current = true;
      } catch (scannerError) {
        console.error('[ScanBarcodeModal] Failed to initialise scanner', scannerError);
        setError('Unable to access camera. Try manual entry or check permissions.');
        isScannerRunningRef.current = false;
        if (qrCodeRef.current) {
          qrCodeRef.current = null;
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
      if (qrCodeRef.current && isScannerRunningRef.current) {
        qrCodeRef.current
          .stop()
          .then(() => {
            isScannerRunningRef.current = false;
            try {
              qrCodeRef.current?.clear();
            } catch {
              // Ignore clear errors
            }
          })
          .catch((stopError) => {
            // Ignore "scanner is not running" errors
            const errorMessage = stopError?.message || String(stopError);
            if (!errorMessage.toLowerCase().includes('not running') && !errorMessage.toLowerCase().includes('not paused')) {
              console.error('[ScanBarcodeModal] Failed to stop scanner', stopError);
            }
            isScannerRunningRef.current = false;
          });
        qrCodeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleScan = async (barcode: string) => {
    const currentMode = modeRef.current;
    const trimmed = barcode.trim();
    if (!trimmed) {
      setError('Barcode is empty. Please try again.');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      await onScan(trimmed, currentMode);
      // Clear manual input and show success message
      setManualBarcode('');
      setSuccessMessage(`Successfully processed ${currentMode === 'order' ? 'order' : 'return'}! Continue scanning...`);
      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (scanError) {
      console.error('[ScanBarcodeModal] Failed to process scan', scanError);
      setError(scanError instanceof Error ? scanError.message : 'Unable to process scan, try again.');
      setSuccessMessage(null);
    }
  };
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const handleSubmitManual = async () => {
    await handleScan(manualBarcode);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-sm sm:max-w-md overflow-y-auto rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base sm:text-lg font-semibold text-primary">Scan Product Barcode</h2>
          <button
            type="button"
            className="rounded-full p-1.5 sm:p-2 text-madas-text/60 transition-colors hover:bg-base"
            onClick={onClose}
            disabled={submitting}
          >
            <span className="material-icons text-lg sm:text-xl">close</span>
          </button>
        </header>

        <div className="space-y-4 sm:space-y-6 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-madas-text/70">
            <span className="material-icons text-base text-primary flex-shrink-0 mt-0.5">info</span>
            <span>Scan an item to deduct stock for an order or add stock for a return.</span>
          </div>

          <div className="rounded-xl border border-gray-100">
            <div className="bg-base/60 px-3 py-2.5 sm:px-4 sm:py-3">
              <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-madas-text/70">
                <input
                  type="radio"
                  name="scan-mode"
                  value="order"
                  checked={mode === 'order'}
                  onChange={() => setMode('order')}
                  className="text-primary focus:ring-accent"
                />
                Order (decrement stock)
              </label>
              <label className="mt-2 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-madas-text/70">
                <input
                  type="radio"
                  name="scan-mode"
                  value="return"
                  checked={mode === 'return'}
                  onChange={() => setMode('return')}
                  className="text-primary focus:ring-accent"
                />
                Return (increase stock)
              </label>
            </div>

            <div className="p-3 sm:p-4">
              <div id="qr-reader-container" className="flex flex-col gap-2 sm:gap-3">
                <div 
                  id="qr-reader" 
                  ref={containerRef} 
                  className="overflow-hidden rounded-lg border border-gray-200 w-full"
                  style={{ minHeight: '250px', maxHeight: '400px' }}
                />
                <p className="text-xs text-madas-text/60 text-center sm:text-left">
                  Scan a barcode and it will appear in the input field below. Press "Apply" to process it.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={manualBarcode}
                onChange={(event) => {
                  setManualBarcode(event.target.value);
                  setScannedBarcode(null);
                }}
                placeholder="Scan barcode or enter manually"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                  scannedBarcode ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              />
              {scannedBarcode && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600">
                  <span className="material-icons text-base">check_circle</span>
                  <span className="text-xs font-medium">Scanned</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                className="w-full sm:w-auto rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                onClick={handleSubmitManual}
                disabled={submitting || !manualBarcode.trim()}
              >
                {submitting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">qr_code_scanner</span>
                    Apply {mode === 'order' ? 'order' : 'return'}
                  </>
                )}
              </button>
            </div>
          </div>

          {error ? <p className="text-xs sm:text-sm text-red-600">{error}</p> : null}
          {successMessage ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <span className="material-icons text-green-600 text-base">check_circle</span>
              <p className="text-xs sm:text-sm text-green-700">{successMessage}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScanBarcodeModal;

