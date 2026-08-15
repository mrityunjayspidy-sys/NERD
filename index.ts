import { Platform } from 'react-native';

// Web runtime polyfill and global focus outline reset
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Inject global CSS to remove ugly default browser focus outlines on inputs
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

  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
    if (prop === 'registerWebModule') {
      if (descriptor.get) {
        const originalGet = descriptor.get;
        descriptor.get = function () {
          const originalFunc = originalGet();
          return function (modClass: any, ...args: any[]) {
            if (modClass && !modClass.name) {
              const moduleName = args[0] || 'UnknownModule';
              try {
                originalDefineProperty(modClass, 'name', { value: moduleName, configurable: true });
              } catch (_) { }
            }
            return originalFunc(modClass, ...args);
          };
        };
      } else if (descriptor.value) {
        const originalFunc = descriptor.value;
        descriptor.value = function (modClass: any, ...args: any[]) {
          if (modClass && !modClass.name) {
            const moduleName = args[0] || 'UnknownModule';
            try {
              originalDefineProperty(modClass, 'name', { value: moduleName, configurable: true });
            } catch (_) { }
          }
          return originalFunc(modClass, ...args);
        };
      }
    }
    return originalDefineProperty(obj, prop, descriptor);
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
