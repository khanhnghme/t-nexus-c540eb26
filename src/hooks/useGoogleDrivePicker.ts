import { useState, useCallback } from 'react';
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

// Google Picker API types
declare global {
  interface Window {
    google?: {
      picker: {
        PickerBuilder: new () => any;
        ViewId: { DOCS: string };
        Action: { PICKED: string; CANCEL: string };
        Feature: { MULTISELECT_ENABLED: string };
      };
    };
    gapi?: {
      load: (api: string, cb: () => void) => void;
    };
  }
}

let pickerApiLoaded = false;
let gapiLoaded = false;

function loadGapiScript(): Promise<void> {
  if (gapiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.getElementById('gapi-script')) {
      // Script tag exists, wait for load
      const check = setInterval(() => {
        if (window.gapi) { gapiLoaded = true; clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('GAPI timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gapi-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => { gapiLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load GAPI'));
    document.head.appendChild(script);
  });
}

function loadPickerApi(): Promise<void> {
  if (pickerApiLoaded) return Promise.resolve();
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

  const openPicker = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load APIs
      await loadGapiScript();
      await loadPickerApi();

      // Get token
      const tokenData = await getPickerToken();
      if (!tokenData) {
        toast({ title: 'Không thể lấy token Google Drive', description: 'Vui lòng kết nối lại.', variant: 'destructive' });
        return;
      }

      const { access_token, client_id } = tokenData;
      const google = window.google;
      if (!google?.picker) {
        toast({ title: 'Google Picker chưa sẵn sàng', variant: 'destructive' });
        return;
      }

      const view = new google.picker.PickerBuilder()
        .addView(google.picker.ViewId.DOCS)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(access_token)
        .setDeveloperKey('') // Not needed with OAuth token
        .setAppId(client_id.split('-')[0]) // Extract app ID from client ID
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
        })
        .build();

      view.setVisible(true);
    } catch (err) {
      console.error('Picker error:', err);
      toast({ title: 'Lỗi mở Google Drive Picker', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [getPickerToken, onFilesPicked, toast]);

  return { openPicker, isLoading };
}
