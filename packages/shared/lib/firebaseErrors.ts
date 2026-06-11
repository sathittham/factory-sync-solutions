export function mapFirebaseError(code: string, t: (key: string) => string): string {
  switch (code) {
    case 'auth/invalid-email':
      return t('signin.errorInvalidEmail');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('signin.errorInvalidCredential');
    case 'auth/email-already-in-use':
      return t('signin.errorEmailInUse');
    case 'auth/weak-password':
      return t('signin.errorWeakPassword');
    case 'auth/account-exists-with-different-credential':
      return t('signin.errorAccountExistsOtherProvider');
    case 'auth/too-many-requests':
      return t('signin.errorTooManyRequests');
    case 'auth/network-request-failed':
      return t('signin.errorNetwork');
    default:
      return t('signin.errorGeneric');
  }
}
