/* עובד הרקע של ההתראות: מציג התראה לטלפון כשהפורטל סגור.
   הלחיצה על ההתראה פותחת את הקישור שהשרת צירף (webpush.fcmOptions.link). */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyDytvmAX1Sm8KEKINOreUeRutDbnxinVXA",
  authDomain: "yudbet-almog.firebaseapp.com",
  databaseURL: "https://yudbet-almog-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "yudbet-almog",
  storageBucket: "yudbet-almog.firebasestorage.app",
  messagingSenderId: "933488998542",
  appId: "1:933488998542:web:c3a36396573c808ba071df"
});
firebase.messaging();
