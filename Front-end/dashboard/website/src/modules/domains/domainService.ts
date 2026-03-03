import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CustomDomain {
  id: string;
  domain: string;
  businessId: string;
  siteId: string;
  status: 'pending' | 'verified' | 'failed' | 'active';
  verificationToken: string;
  dnsRecords: DNSRecord[];
  verifiedAt?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface DNSRecord {
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl: number;
  verified: boolean;
}

export interface DomainVerificationResult {
  success: boolean;
  message: string;
  records: DNSRecord[];
}

/**
 * Domain Service - Manages custom domain verification and routing
 */
export class DomainService {
  /**
   * Add custom domain to a site
   * @param domain - Domain name (e.g., "example.com")
   * @param businessId - Business ID
   * @param siteId - Site ID
   * @returns Promise<CustomDomain>
   */
  static async addCustomDomain(domain: string, businessId: string, siteId: string): Promise<CustomDomain> {
    try {
      console.log('Adding custom domain:', domain, 'for business:', businessId);

      // Validate domain format
      if (!this.isValidDomain(domain)) {
        throw new Error('Invalid domain format');
      }

      // Check if domain is already in use
      const existingDomainQuery = query(
        collection(db, 'custom_domains'),
        where('domain', '==', domain)
      );
      const existingDomains = await getDocs(existingDomainQuery);

      if (!existingDomains.empty) {
        throw new Error('Domain is already in use');
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      // Create DNS records for verification
      const dnsRecords: DNSRecord[] = [
        {
          type: 'TXT',
          name: `_madas-verification.${domain}`,
          value: verificationToken,
          ttl: 300,
          verified: false
        },
        {
          type: 'CNAME',
          name: domain,
          value: 'madas-store.web.app',
          ttl: 300,
          verified: false
        }
      ];

      // Create domain document
      const domainData: Omit<CustomDomain, 'id'> = {
        domain,
        businessId,
        siteId,
        status: 'pending',
        verificationToken,
        dnsRecords,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const domainRef = doc(collection(db, 'custom_domains'));
      await setDoc(domainRef, domainData);

      const customDomain: CustomDomain = {
        id: domainRef.id,
        ...domainData
      };

      console.log('Custom domain added:', customDomain.id);
      return customDomain;

    } catch (error) {
      console.error('Error adding custom domain:', error);
      throw new Error(`Failed to add custom domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify domain DNS records
   * @param domainId - Domain ID
   * @returns Promise<DomainVerificationResult>
   */
  static async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    try {
      console.log('Verifying domain:', domainId);

      const domainRef = doc(db, 'custom_domains', domainId);
      const domainDoc = await getDoc(domainRef);

      if (!domainDoc.exists()) {
        throw new Error('Domain not found');
      }

      const domainData = domainDoc.data() as CustomDomain;

      // In a real implementation, this would check actual DNS records
      // For now, we'll simulate the verification process
      const verificationResult = await this.checkDNSRecords(domainData.domain, domainData.dnsRecords);

      if (verificationResult.success) {
        // Update domain status to verified
        await updateDoc(domainRef, {
          status: 'verified',
          verifiedAt: serverTimestamp(),
          dnsRecords: verificationResult.records,
          updatedAt: serverTimestamp()
        });

        // Update site with custom domain
        const siteRef = doc(db, 'sites', domainData.siteId);
        await updateDoc(siteRef, {
          customDomain: domainData.domain,
          updatedAt: serverTimestamp()
        });

        console.log('Domain verified successfully:', domainId);
      } else {
        // Update domain status to failed
        await updateDoc(domainRef, {
          status: 'failed',
          dnsRecords: verificationResult.records,
          updatedAt: serverTimestamp()
        });

        console.log('Domain verification failed:', domainId);
      }

      return verificationResult;

    } catch (error) {
      console.error('Error verifying domain:', error);
      throw new Error(`Failed to verify domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get domains for a business
   * @param businessId - Business ID
   * @returns Promise<CustomDomain[]>
   */
  static async getBusinessDomains(businessId: string): Promise<CustomDomain[]> {
    try {
      const domainsQuery = query(
        collection(db, 'custom_domains'),
        where('businessId', '==', businessId)
      );
      const domainsDocs = await getDocs(domainsQuery);

      return domainsDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomDomain));

    } catch (error) {
      console.error('Error getting business domains:', error);
      throw new Error(`Failed to get business domains: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove custom domain
   * @param domainId - Domain ID
   * @returns Promise<void>
   */
  static async removeCustomDomain(domainId: string): Promise<void> {
    try {
      console.log('Removing custom domain:', domainId);

      const domainRef = doc(db, 'custom_domains', domainId);
      const domainDoc = await getDoc(domainRef);

      if (!domainDoc.exists()) {
        throw new Error('Domain not found');
      }

      const domainData = domainDoc.data() as CustomDomain;

      // Remove custom domain from site
      const siteRef = doc(db, 'sites', domainData.siteId);
      await updateDoc(siteRef, {
        customDomain: null,
        updatedAt: serverTimestamp()
      });

      // Delete domain document
      await deleteDoc(domainRef);

      console.log('Custom domain removed:', domainId);

    } catch (error) {
      console.error('Error removing custom domain:', error);
      throw new Error(`Failed to remove custom domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if domain is valid
   * @param domain - Domain name
   * @returns boolean
   */
  private static isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|xn--[a-zA-Z0-9-]+)$/;
    return domainRegex.test(domain);
  }

  /**
   * Generate verification token
   * @returns string
   */
  private static generateVerificationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check DNS records (simulated)
   * @param domain - Domain name
   * @param records - DNS records to check
   * @returns Promise<DomainVerificationResult>
   */
  private static async checkDNSRecords(domain: string, records: DNSRecord[]): Promise<DomainVerificationResult> {
    // In a real implementation, this would use a DNS lookup service
    // For now, we'll simulate the verification process
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 80% success rate
        const success = Math.random() > 0.2;
        
        const updatedRecords = records.map(record => ({
          ...record,
          verified: success
        }));

        resolve({
          success,
          message: success 
            ? 'Domain verification successful' 
            : 'DNS records not found or incorrect',
          records: updatedRecords
        });
      }, 2000);
    });
  }

  /**
   * Get domain verification instructions
   * @param domain - Domain name
   * @param records - DNS records
   * @returns string
   */
  static getVerificationInstructions(domain: string, records: DNSRecord[]): string {
    let instructions = `To verify your domain ${domain}, add the following DNS records:\n\n`;
    
    records.forEach((record, index) => {
      instructions += `${index + 1}. ${record.type} Record:\n`;
      instructions += `   Name: ${record.name}\n`;
      instructions += `   Value: ${record.value}\n`;
      instructions += `   TTL: ${record.ttl}\n\n`;
    });

    instructions += `After adding these records, click "Verify Domain" to complete the process.`;
    
    return instructions;
  }

  /**
   * Check if user can add custom domains (based on subscription)
   * @param businessId - Business ID
   * @returns Promise<boolean>
   */
  static async canAddCustomDomain(businessId: string): Promise<boolean> {
    try {
      // Check business subscription
      const businessRef = doc(db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);

      if (!businessDoc.exists()) {
        return false;
      }

      const businessData = businessDoc.data();
      
      // Only Pro and Enterprise plans can use custom domains
      return businessData.plan === 'Pro' || businessData.plan === 'Enterprise';

    } catch (error) {
      console.error('Error checking custom domain permissions:', error);
      return false;
    }
  }

  /**
   * Get domain status color
   * @param status - Domain status
   * @returns string
   */
  static getStatusColor(status: CustomDomain['status']): string {
    switch (status) {
      case 'verified':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get domain status label
   * @param status - Domain status
   * @returns string
   */
  static getStatusLabel(status: CustomDomain['status']): string {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending Verification';
      case 'failed':
        return 'Verification Failed';
      default:
        return 'Unknown';
    }
  }
}
