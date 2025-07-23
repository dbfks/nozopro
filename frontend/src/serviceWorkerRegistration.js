// src/serviceWorkerRegistration.js

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  // [::1] (IPv6 localhost)
  window.location.hostname === '[::1]' ||
  // 127.0.0.0/8 IPv4 localhost
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    window.addEventListener('load', () => {
      if (isLocalhost) {
        // 로컬 개발환경: 이미 배포된 sw가 있는지 검사
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('This web app is being served cache-first by a service worker.');
        });
      } else {
        // 프로덕션 환경: 바로 등록
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('Service Worker registered:', registration);
      // 업데이트 감지 콜백 등 config 활용 가능
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then(response => {
      // sw가 없거나 잘못되었으면 unregister 후 페이지 리로드
      if (response.status === 404 || response.headers.get('content-type').indexOf('javascript') === -1) {
        navigator.serviceWorker.ready.then(reg => {
          reg.unregister().then(() => window.location.reload());
        });
      } else {
        // 유효하면 등록
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => console.log('No internet connection found. App is running in offline mode.'));
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    });
  }
}
