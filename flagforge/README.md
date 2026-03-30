# FlagForge — Setup Guide

## File Structure
```
flagforge/
├── index.html          ← Landing page (public)
├── login.html          ← Login + Register (tab-based)
├── register.html       ← Redirects to login.html?tab=register
├── dashboard.html      ← Student dashboard (auth required)
├── challenges.html     ← Challenge browser (auth required)
├── challenge.html      ← Individual challenge + flag submit (auth required)
├── leaderboard.html    ← Global leaderboard (auth required)
├── profile.html        ← My profile + solve history (auth required)
├── admin.html          ← Admin dashboard (admin role required)
├── css/
│   └── main.css        ← Shared design system
└── js/
    └── firebase.js     ← Firebase config + shared utilities
```

## 1. Firebase Setup

1. Go to https://console.firebase.google.com
2. Create a new project (free Spark plan is fine)
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firestore Database** (Start in production mode)
5. Copy your config from Project Settings → General → Your apps

## 2. Add Your Firebase Config

Open `js/firebase.js` and replace the placeholder config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 3. Firestore Security Rules

Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isAdmin() {
      return isAuth() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isOwner(uid) { return isAuth() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isAuth();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin();
    }
    match /usernames/{username} {
      allow read: if true;
      allow write: if isAuth();
    }
    match /challenges/{id} {
      allow read: if resource.data.published == true || isAdmin();
      allow write: if isAdmin();
    }
    match /solves/{id} {
      allow read: if isAuth();
      allow create: if isAuth() && request.auth.uid == request.resource.data.uid;
      allow update, delete: if isAdmin();
    }
    match /attempts/{id} {
      allow read, write: if isAuth();
    }
    match /meta/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

## 4. Make Yourself Admin

After registering your account:
1. Go to Firestore → users collection
2. Find your user document
3. Change `role` from `"student"` to `"admin"`

Then access the Admin Dashboard at `admin.html`.

## 5. Challenge Files

Since FlagForge is serverless, attach files via:
- **Google Drive**: Share → Anyone with the link → Copy link
- **GitHub**: Upload to a repo, use the raw file URL

Paste the link in the Admin → Create Challenge → "Add File Link" section.

## 6. Hosting

Deploy to any static hosting:
- **Firebase Hosting**: `firebase deploy`
- **Netlify**: Drag and drop the folder
- **GitHub Pages**: Push to a repo, enable Pages
- **Vercel**: Import from GitHub

## 7. Firestore Indexes

If you see index errors in the browser console, Firestore will provide a link to create the needed index. Click it — it takes about 1 minute to build.

Indexes typically needed:
- `solves` collection: `uid` ASC + `solvedAt` DESC
- `challenges` collection: `published` ASC + `createdAt` DESC

---

Built with Firebase (Spark plan), vanilla JS, and no backend required.
