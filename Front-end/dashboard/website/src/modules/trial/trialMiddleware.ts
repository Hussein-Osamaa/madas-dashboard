import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { TrialService } from './trialService';

export interface TrialMiddlewareOptions {
  onTrialExpired?: (trialData: any) => void;
  onTrialWarning?: (daysRemaining: number) => void;
  warningDays?: number;
}

/**
 * Trial Middleware - Enforces trial limits and shows warnings
 */
export class TrialMiddleware {
  private static instance: TrialMiddleware;
  private currentUser: any = null;
  private trialData: any = null;
  private options: TrialMiddlewareOptions;

  private constructor(options: TrialMiddlewareOptions = {}) {
    this.options = {
      warningDays: 3,
      ...options
    };
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: TrialMiddlewareOptions): TrialMiddleware {
    if (!TrialMiddleware.instance) {
      TrialMiddleware.instance = new TrialMiddleware(options);
    }
    return TrialMiddleware.instance;
  }

  /**
   * Initialize the middleware
   */
  private initialize(): void {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        await this.checkTrialStatus(user.uid);
      } else {
        this.trialData = null;
      }
    });
  }

  /**
   * Check trial status for current user
   */
  private async checkTrialStatus(uid: string): Promise<void> {
    try {
      const trialData = await TrialService.checkTrialStatus(uid);
      this.trialData = trialData;

      if (!trialData) {
        console.warn('No trial data found for user:', uid);
        return;
      }

      // Check if trial has expired
      if (!trialData.isTrialActive) {
        console.log('Trial expired for user:', uid);
        this.options.onTrialExpired?.(trialData);
        return;
      }

      // Check if trial is expiring soon
      if (trialData.trialDaysRemaining <= (this.options.warningDays || 3)) {
        console.log(`Trial expiring in ${trialData.trialDaysRemaining} days for user:`, uid);
        this.options.onTrialWarning?.(trialData.trialDaysRemaining);
      }

    } catch (error) {
      console.error('Error checking trial status in middleware:', error);
    }
  }

  /**
   * Check if current user can access a feature
   * @param feature - Feature name to check
   * @returns boolean
   */
  canAccessFeature(feature: string): boolean {
    if (!this.currentUser || !this.trialData) {
      return false;
    }

    // Admin users always have access
    if (this.trialData.role === 'admin') {
      return true;
    }

    // Check if user has active subscription
    if (this.trialData.subscriptionStatus === 'active') {
      return true;
    }

    // Check trial status
    if (!this.trialData.isTrialActive) {
      return false;
    }

    // Define feature limits for trial users
    const trialLimits: Record<string, boolean> = {
      'dashboard': true,
      'products': true,
      'orders': true,
      'analytics': true,
      'staff': false, // Limited in trial
      'custom_domains': false, // Limited in trial
      'advanced_analytics': false, // Limited in trial
      'api_access': false, // Limited in trial
    };

    return trialLimits[feature] !== false;
  }

  /**
   * Get current trial data
   */
  getTrialData(): any {
    return this.trialData;
  }

  /**
   * Get current user
   */
  getCurrentUser(): any {
    return this.currentUser;
  }

  /**
   * Check if user is on trial
   */
  isOnTrial(): boolean {
    return this.trialData?.isTrialActive || false;
  }

  /**
   * Check if user has active subscription
   */
  hasActiveSubscription(): boolean {
    return this.trialData?.subscriptionStatus === 'active' || false;
  }

  /**
   * Get days remaining in trial
   */
  getDaysRemaining(): number {
    return this.trialData?.trialDaysRemaining || 0;
  }

  /**
   * Force refresh trial status
   */
  async refreshTrialStatus(): Promise<void> {
    if (this.currentUser) {
      await this.checkTrialStatus(this.currentUser.uid);
    }
  }
}

/**
 * Hook to use trial middleware in React components
 */
export function useTrialMiddleware(options?: TrialMiddlewareOptions) {
  const middleware = TrialMiddleware.getInstance(options);
  
  return {
    canAccessFeature: (feature: string) => middleware.canAccessFeature(feature),
    getTrialData: () => middleware.getTrialData(),
    getCurrentUser: () => middleware.getCurrentUser(),
    isOnTrial: () => middleware.isOnTrial(),
    hasActiveSubscription: () => middleware.hasActiveSubscription(),
    getDaysRemaining: () => middleware.getDaysRemaining(),
    refreshTrialStatus: () => middleware.refreshTrialStatus(),
  };
}
