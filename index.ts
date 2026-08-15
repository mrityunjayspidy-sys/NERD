import { Platform } from 'react-native';

// Web runtime global focus outline reset
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'nerd-global-reset';
    style.textContent = `
      input, textarea, select, [contenteditable="true"] {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
