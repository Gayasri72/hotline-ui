import { useState, useEffect } from 'react';

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  percent: number;
  version?: string;
  error?: string;
}

export default function UpdateProgress() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: 'idle',
    percent: 0,
  });

  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleChecking = () => {
      setUpdateState({ status: 'checking', percent: 0 });
    };

    const handleAvailable = (_event: unknown, version: string) => {
      setUpdateState({ status: 'available', percent: 0, version });
    };

    const handleProgress = (_event: unknown, percent: number) => {
      setUpdateState((prev) => ({ ...prev, status: 'downloading', percent }));
    };

    const handleDownloaded = (_event: unknown, version: string) => {
      setUpdateState({ status: 'ready', percent: 100, version });
    };

    const handleError = (_event: unknown, error: string) => {
      setUpdateState({ status: 'error', percent: 0, error });
    };

    const handleNoUpdate = () => {
      setUpdateState({ status: 'idle', percent: 0 });
    };

    window.ipcRenderer.on('update-checking', handleChecking);
    window.ipcRenderer.on('update-available', handleAvailable);
    window.ipcRenderer.on('update-download-progress', handleProgress);
    window.ipcRenderer.on('update-downloaded', handleDownloaded);
    window.ipcRenderer.on('update-error', handleError);
    window.ipcRenderer.on('update-not-available', handleNoUpdate);

    return () => {
      window.ipcRenderer.off('update-checking', handleChecking);
      window.ipcRenderer.off('update-available', handleAvailable);
      window.ipcRenderer.off('update-download-progress', handleProgress);
      window.ipcRenderer.off('update-downloaded', handleDownloaded);
      window.ipcRenderer.off('update-error', handleError);
      window.ipcRenderer.off('update-not-available', handleNoUpdate);
    };
  }, []);

  // Don't show anything if idle or checking
  if (updateState.status === 'idle' || updateState.status === 'checking') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ display: updateState.status === 'downloading' ? 'block' : 'none' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" style={{ display: updateState.status === 'ready' ? 'block' : 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">
              {updateState.status === 'downloading' && 'Downloading Update...'}
              {updateState.status === 'ready' && 'Update Ready!'}
              {updateState.status === 'available' && 'Update Available'}
              {updateState.status === 'error' && 'Update Error'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {updateState.status === 'downloading' && (
            <>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Version {updateState.version}</span>
                <span>{Math.round(updateState.percent)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${updateState.percent}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The update will install when you restart the app
              </p>
            </>
          )}

          {updateState.status === 'ready' && (
            <p className="text-sm text-gray-600">
              Version {updateState.version} is ready. Restart to apply the update.
            </p>
          )}

          {updateState.status === 'error' && (
            <p className="text-sm text-red-600">
              {updateState.error || 'Failed to download update'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
