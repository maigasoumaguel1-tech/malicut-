import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.malicut.app',
  appName: 'MaliCut',
  webDir: 'www',
  server: {
    url: 'https://malicut.onrender.com',
    cleartext: false
  },
  android: {
    backgroundColor: '#0b0e12'
  }
};

export default config;
