import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DriveFile {
  drive_file_id: string;
  title: string;
  url: string;
  mime_type: string;
  icon_url: string;
  file_size: number;
  type: 'drive';
}

declare global {
  interface Window {
    google?: {
      picker: {
        PickerBuilder: new () => any;
        ViewId: { DOCS: string };
        Action: { PICKED: string; CANCEL: string };
        Feature: { MULTISELECT_ENABLED: string };
        DocsView: new (viewId?: string) => any;
      };
    };
    gapi?: {
      load: (api: string, cb: () => void) => void;
    };
  }
}

let pickerApiLoaded = false;

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      // Already in DOM — check if loaded
      if (id === 'gapi-script' && window.gapi) return resolve();
      const check = setInterval(() => {
        if (id === 'gapi-script' && window.gapi) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error(`Timeout loading ${id}`)); }, 8000);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadPickerApi(): Promise<void> {
  if (pickerApiLoaded && window.google?.picker) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (!window.gapi) { reject(new Error('GAPI not loaded')); return; }
    window.gapi.load('picker', () => {
      pickerApiLoaded = true;
      resolve();
    });
  });
}

interface UseGoogleDrivePickerOptions {
  getPickerToken: () => Promise<{ access_token: string; client_id: string } | null>;
  onFilesPicked: (files: DriveFile[]) => void;
}

export function useGoogleDrivePicker({ getPickerToken, onFilesPicked }: UseGoogleDrivePickerOptions) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const pickerVisible = useRef(false);

  const openPicker = useCallback(async () => {
    if (isLoading || pickerVisible.current) return;
    setIsLoading(true);
    try {
      // Load GAPI + Picker
      await loadScript('https://apis.google.com/js/api.js', 'gapi-script');
      await loadPickerApi();

      const tokenData = await getPickerToken();
      if (!tokenData) {
        toast({ title: 'Không thể lấy token Google Drive', description: 'Vui lòng kết nối lại.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const { access_token } = tokenData;
      const google = window.google;
      if (!google?.picker) {
        toast({ title: 'Google Picker chưa sẵn sàng', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      pickerVisible.current = true;

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(access_token)
        .setOrigin(window.location.protocol + '//' + window.location.host)
        .setSize(900, 550)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const files: DriveFile[] = data.docs.map((doc: any) => ({
              drive_file_id: doc.id,
              title: doc.name,
              url: doc.url,
              mime_type: doc.mimeType,
              icon_url: doc.iconUrl || '',
              file_size: doc.sizeBytes || 0,
              type: 'drive' as const,
            }));
            onFilesPicked(files);
          }
          if (data.action === google.picker.Action.PICKED || data.action === google.picker.Action.CANCEL) {
            pickerVisible.current = false;
            setIsLoading(false);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error('Picker error:', err);
      toast({ title: 'Lỗi mở Google Drive Picker', variant: 'destructive' });
      pickerVisible.current = false;
      setIsLoading(false);
    }
  }, [getPickerToken, onFilesPicked, toast, isLoading]);

  return { openPicker, isLoading };
}
