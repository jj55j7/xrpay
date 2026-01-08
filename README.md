# XRPay - Mobile Payment App for Parents and Students

XRPay is a mobile application built with Expo and React Native that enables secure and efficient money transfers between parents and students using the XRP Ledger (XRPL) and RLUSD stablecoin. The app facilitates parental control over student spending while providing students with a modern, user-friendly interface for managing allowances and transactions.

## Features

- **Dual Role System**: Separate interfaces for parents and students with role-based access control
- **XRPL Integration**: Secure blockchain-based transactions using RLUSD stablecoin
- **Wallet Management**: Automated wallet creation, funding, and trustline setup
- **Money Transfer**: Easy-to-use interface for sending RLUSD between parent and student accounts
- **Transaction History**: Complete transaction tracking and history viewing
- **Real-time Balances**: Live balance updates for XRP and RLUSD
- **Testnet Support**: Full functionality on XRPL Testnet for development and testing

## Architecture

### Account Types

**Parent Account:**
- Manages student allowances
- Initiates money transfers to connected students
- Views transaction history
- Access to parent-specific tabs: Home, Send, History

**Student Account:**
- Receives allowances from parents
- Views personal transaction history
- Connects to parent accounts for receiving funds
- Access to student-specific tabs: Home, Profile, Explore, Connect Parent

### Currency System

- **RLUSD**: Custom stablecoin issued on XRPL for educational payments
- **XRP**: Native XRPL currency used for transaction fees and account activation
- **Trustlines**: Automatic setup of RLUSD trustlines for seamless transactions

## App Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jj55j7/xrpay.git
   cd xrpay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Follow the Expo CLI prompts to open the app in:
   - iOS Simulator
   - Android Emulator
   - Expo Go app
   - Web browser

## Wallet Setup Process

The app includes automated scripts for setting up parent and student wallets on the XRPL Testnet.

### 1. Create RLUSD Issuer

First, create the RLUSD issuer account:

```bash
node create-rlusd-issuer.js
```

This script generates a new issuer wallet and outputs the issuer seed and address.

### 2. Setup Parent Wallet

Set up a parent wallet with RLUSD trustline:

```bash
node setup-parent-wallet.js <PARENT_SEED> <ISSUER_ADDRESS>
```

Example:
```bash
node setup-parent-wallet.js sEdT2bag8k3ZoFf2xcJRwMhdFcZVp9A rHTfLCQULr4HLGnyoDKgN8jNzLGYVhth2d
```

This process:
- Loads the parent wallet from seed
- Funds the wallet with XRP from testnet faucet
- Sets up RLUSD trustline to the issuer
- Verifies balances

### 3. Setup Student Wallet

Set up a student wallet with RLUSD trustline:

```bash
node setup-student-wallet.js <STUDENT_SEED> <ISSUER_ADDRESS>
```

Example:
```bash
node setup-student-wallet.js sEdStGfKgG8Jh8t4uMJJZbfPwsvqzrg rHTfLCQULr4HLGnyoDKgN8jNzLGYVhth2d
```

Similar to parent setup but optimized for student accounts.

### 4. Issue RLUSD to Parent

Issue RLUSD from the issuer to the parent wallet:

```bash
node issue-rlusd.js <ISSUER_SEED> <PARENT_ADDRESS> <AMOUNT>
```

Example:
```bash
node issue-rlusd.js sEdTtohmp9nViTW9LViMx3tDfh6nvWW rhAnsuo7fgghP4oHXHRB15mZV1Zdg4yZZA 10000
```

This issues the specified amount of RLUSD to the parent wallet.

## Money Transfer Process

### Within the App

1. **Parent Login**: Parents log in with their credentials
2. **Connect Student**: Parents connect to student accounts (if not already connected)
3. **Send Money**: Parents use the "Send" tab to transfer RLUSD to students
4. **Student Receives**: Students see incoming transfers in their transaction history
5. **View History**: Both parties can view complete transaction histories

### Technical Flow

1. Parent initiates transfer through app UI
2. App validates balances and permissions
3. XRPL transaction is prepared and signed
4. Transaction is submitted to XRPL Testnet
5. Both wallets update with new balances
6. Transaction is recorded in history

## App Navigation

### Parent Tabs
- **Home**: Dashboard with balances and quick actions
- **Send**: Interface for transferring RLUSD to students
- **History**: Complete transaction history

### Student Tabs
- **Home**: Dashboard with current balance and recent activity
- **Profile**: Account settings and information
- **Explore**: Educational content and spending options
- **Connect Parent**: Interface for connecting to parent accounts

## Additional Scripts

- `check-account-settings.js`: Verify account configuration
- `check-transaction.js`: Check transaction status
- `check-trustline.js`: Verify RLUSD trustline setup
- `check-wallet.js`: Validate wallet status
- `clear-no-ripple.js`: Clear no-ripple flags
- `enable-rippling.js`: Enable rippling for issuer
- `verify-seed.js`: Verify wallet seed validity

## Development

### Project Structure

```
app/
├── (parent-tabs)/          # Parent-specific screens
├── (tabs)/                 # Student-specific screens
├── auth/                   # Authentication screens
└── _layout.tsx            # Root layout

components/                 # Reusable UI components
constants/                  # App constants and themes
hooks/                      # Custom React hooks
scripts/                    # Wallet setup and utility scripts
services/                   # XRPL and wallet services
```

### Key Technologies

- **Expo**: React Native framework for cross-platform development
- **React Navigation**: Navigation between screens
- **XRPL.js**: XRP Ledger JavaScript library
- **Firebase**: Backend services for authentication and data storage
- **TypeScript**: Type-safe JavaScript development

## Testing

The app is designed to work on XRPL Testnet. All wallet operations and transactions are tested on the testnet environment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on testnet
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue on GitHub or contact the development team.
