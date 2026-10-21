# SpeakFlow Mobile

App nativo iOS + Android do SpeakFlow, construído com **Expo (React Native)** seguindo Clean Architecture, SOLID e Clean Code.

## Arquitetura

```
speakflowMobile/
├── app/                    ← Expo Router (navegação por arquivo)
│   ├── (auth)/             ← Telas de login e registro
│   └── (app)/              ← Telas autenticadas (tabs)
│       ├── index.tsx       ← Home
│       ├── tools/          ← Ferramentas IA
│       ├── live.tsx        ← Live Assist (microfone nativo)
│       ├── circles.tsx     ← Circles
│       └── profile.tsx     ← Perfil + logout
│
└── src/
    ├── domain/             ← Entidades, interfaces de repositórios, use cases
    ├── infrastructure/     ← API callers, SecureStore, repositórios concretos
    ├── presentation/       ← Stores Zustand, hooks, componentes
    └── shared/             ← Tipos, constantes, utils (Zod)
```

## Princípios

- **Domain isolado**: sem dependência de React/RN — só TypeScript puro
- **Inversão de dependência**: telas dependem de interfaces, não implementações
- **Token seguro**: JWT em `expo-secure-store` (hardware-backed) — nunca `AsyncStorage`
- **ApiClient centralizado**: Bearer token injetado automaticamente + timeout + erros tipados
- **Sem duplicação**: todos os dados vêm das APIs Railway existentes (zero backend novo para fase 1)

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar arquivo .env
```bash
cp .env.example .env
# Editar EXPO_PUBLIC_API_URL se necessário
```

### 3. Rodar no Expo Go (desenvolvimento)
```bash
npx expo start
```
Escanear QR code com o **Expo Go** no celular.

### 4. Build nativo (produção)
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login na conta Expo
eas login

# Configurar projeto
eas build:configure

# Build Android (.apk / .aab)
eas build --platform android

# Build iOS (.ipa) — requer Apple Developer Account
eas build --platform ios
```

## Contas necessárias

| Conta | Link | Custo | Para que |
|-------|------|-------|---------|
| **Expo** | expo.dev | Gratuito | EAS Build + OTA updates |
| **Apple Developer** | developer.apple.com | $99/ano | App Store + push iOS |
| **Google Play Console** | play.google.com/console | $25 único | Play Store |
| **Firebase** | console.firebase.google.com | Gratuito | FCM push Android |

## Variáveis de ambiente

```env
EXPO_PUBLIC_API_URL=https://speakflow.ia.br
```

## Segurança

- Tokens JWT armazenados em `expo-secure-store` (Keychain no iOS, Keystore no Android)
- Todas as requisições usam HTTPS
- Sem dados sensíveis em `AsyncStorage` ou logs
- Validação de entrada com Zod antes de chamar APIs

## Roadmap

- [x] Auth (login / register)
- [x] Home com créditos
- [x] Ferramentas IA (improve, generate, interview)
- [x] Live Assist com gravação de áudio nativa
- [x] Perfil + logout
- [ ] Circles completo
- [ ] CRM (admin only)
- [ ] Push notifications via FCM
- [ ] Deep links (email verification)
- [ ] Apple Sign In
