import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
};

const SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 }
};

const POSBarcodeScanner = ({ open, onClose, onScan }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const stopScanner = async () => {
    if (qrCodeRef.current && isRunningRef.current) {
      try {
        await qrCodeRef.current.stop();
        isRunningRef.current = false;
      } catch (stopError: unknown) {
        // Ignore "scanner is not running" errors
        const errorMessage = stopError instanceof Error ? stopError.message : String(stopError);
        if (!errorMessage.includes('not running') && !errorMessage.includes('not paused')) {
          console.error('[POSBarcodeScanner] Failed to stop scanner', stopError);
        }
      }
    }
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      qrCodeRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setManualBarcode('');
      setError(null);
      return;
    }

    let isMounted = true;
    const init = async () => {
      if (!containerRef.current) return;
      
      // Small delay to ensure DOM is ready
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (!isMounted || !containerRef.current) return;
      
      try {
        // Check if we're on HTTPS or localhost
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isSecure) {
          setError('Camera access requires HTTPS. Please use a secure connection or localhost.');
          return;
        }

        // Initialize scanner first
        if (!qrCodeRef.current) {
          qrCodeRef.current = new Html5Qrcode(containerRef.current.id);
        }

        // Get available cameras (this will also request permissions)
        const cameras = await Html5Qrcode.getCameras();
        
        if (!isMounted) {
          await stopScanner();
          return;
        }

        if (cameras.length === 0) {
          setError('No cameras found. Please check your device has a camera connected.');
          return;
        }

        const preferredCamera =
          cameras.find((camera) =>
            camera.label.toLowerCase().includes('back') ||
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          ) ?? cameras[0];

        // Start the scanner
        await qrCodeRef.current.start(
          preferredCamera.id,
          SCAN_CONFIG,
          async (decodedText) => {
            if (isMounted) {
              await handleScan(decodedText);
            }
          },
          () => {
            // On scan failure, ignore (scanner will keep trying)
          }
        );
        
        isRunningRef.current = true;
        setError(null); // Clear any previous errors
      } catch (scannerError) {
        console.error('[POSBarcodeScanner] Failed to initialise scanner', scannerError);
        const errorMessage = scannerError instanceof Error ? scannerError.message : String(scannerError);
        
        // Provide more specific error messages
        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no camera')) {
          setError('No camera found. Please check your device has a camera connected.');
        } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('already in use')) {
          setError('Camera is already in use by another application. Please close other apps using the camera.');
        } else if (errorMessage.includes('OverconstrainedError')) {
          setError('Camera does not support the required settings. Try manual entry instead.');
        } else {
          setError('Unable to access camera. Please check permissions or use manual entry.');
        }
        
        isRunningRef.current = false;
        if (qrCodeRef.current) {
          try {
            await qrCodeRef.current.clear();
          } catch {
            // Ignore clear errors
          }
          qrCodeRef.current = null;
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryKey]);

  const handleScan = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) {
      setError('Barcode is empty. Please try again.');
      return;
    }

    try {
      setError(null);
      onScan(trimmed);
      onClose();
    } catch (scanError) {
      console.error('[POSBarcodeScanner] Failed to process scan', scanError);
      setError(scanError instanceof Error ? scanError.message : 'Unable to process scan, try again.');
    }
  };

  const handleSubmitManual = async () => {
    await handleScan(manualBarcode);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-primary">Scan Barcode</h2>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 transition-colors hover:bg-base"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-center gap-3 text-sm text-madas-text/70">
            <span className="material-icons text-base text-primary">info</span>
            <div>
              <p>Scan a product barcode to add it to the cart.</p>
              {error && (
                <p className="mt-2 text-xs text-red-600">
                  <span className="material-icons text-sm align-middle mr-1">error</span>
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-icons text-6xl text-madas-text/30 mb-4">camera_alt</span>
                <p className="text-sm font-medium text-madas-text/70 mb-2">Camera Access Required</p>
                <p className="text-xs text-madas-text/60 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    await stopScanner();
                    // Force re-initialization by incrementing retry key
                    setRetryKey((prev) => prev + 1);
                  }}
                  className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div id="qr-reader" ref={containerRef} className="overflow-hidden rounded-lg border border-gray-200" />
                <p className="mt-3 text-xs text-madas-text/60">
                  Having trouble? Enter the barcode manually below.
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitManual();
                }
              }}
              placeholder="Enter barcode manually"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19]"
                onClick={handleSubmitManual}
                disabled={!manualBarcode.trim()}
              >
                <span className="material-icons text-base">qr_code_scanner</span>
                Add to Cart
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default POSBarcodeScanner;

