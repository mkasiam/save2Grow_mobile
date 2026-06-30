# Save2Grow Mobile App

React Native Expo mobile app for Save2Grow fintech application.

## Setup

```bash
npm install
npm start
```

## Running on Different Platforms

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web
```bash
npm run web
```

## Project Structure

```
mobile/
├── app/                 # Expo Router navigation
├── src/
│   ├── screens/        # Screen components
│   ├── components/     # Reusable components
│   ├── services/       # API services
│   ├── hooks/          # Custom React hooks
│   └── types/          # TypeScript types
└── assets/             # Images, fonts, etc.
```

## Features

- 🔐 Student Authentication
- 🎯 Savings Goals Management
- 📊 Progress Tracking
- 📈 Analytics Dashboard
- 💸 Easy Withdrawals
- 👥 Social Challenges

## Key Files

- `src/services/api.ts` - API client configuration
- `src/hooks/useAuth.ts` - Authentication hook
- `src/components/GoalCard.tsx` - Goal display component

## Testing

```bash
npm test
```

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```
