// Capacitor Configuration for MADAS Mobile App
// This configures the native app wrapper for iOS/Android

const { CapacitorConfig } = require('@capacitor/cli');

const config = {
  appId: 'com.madas.mobile',
  appName: 'MADAS Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#27491F",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFFFFF",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#27491F'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      permissions: ['camera']
    },
    Geolocation: {
      permissions: ['location']
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#27491F',
    allowLinkPreview: false,
    handleApplicationURL: false,
    scheme: 'MADAS Mobile',
    limitsNavigationsToAppBoundDomains: false,
    allowsBackForwardNavigationGestures: false,
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    allowsLinkPreview: false,
    disallowOverscroll: false,
    backgroundColor: '#27491F',
    overrideUserInterfaceStyle: 'light',
    presentationStyle: 'fullscreen',
    allowsBackForwardNavigationGestures: false,
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    handleApplicationURL: false,
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
    contentInset: 'automatic',
    backgroundColor: '#27491F',
    allowLinkPreview: false,
    handleApplicationURL: false,
    scheme: 'MADAS Mobile',
    limitsNavigationsToAppBoundDomains: false,
    allowsBackForwardNavigationGestures: false,
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    allowsLinkPreview: false,
    disallowOverscroll: false,
    backgroundColor: '#27491F',
    overrideUserInterfaceStyle: 'light',
    presentationStyle: 'fullscreen'
  },
  android: {
    backgroundColor: '#27491F',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
    overrideUserAgent: 'MADAS Mobile App',
    appendUserAgent: 'MADAS Mobile',
    backgroundColor: '#27491F',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
    overrideUserAgent: 'MADAS Mobile App',
    appendUserAgent: 'MADAS Mobile'
  }
};

module.exports = config;
