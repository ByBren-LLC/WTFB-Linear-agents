import crypto from 'crypto';

/**
 * Verifies the Linear webhook signature
 * 
 * @param signature The signature from the Linear-Signature header
 * @param body The request body
 * @returns boolean indicating if the signature is valid
 */
export const verifyWebhookSignature = (signature: string, body: any): boolean => {
  if (!signature) {
    return false;
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET environment variable is not set');
    return false;
  }

  try {
    // Extract timestamp and signature from the header
    const [timestamp, signatureHash] = signature.split(',');
    
    if (!timestamp || !signatureHash) {
      return false;
    }
    
    // Extract the actual values
    const timestampValue = timestamp.split('=')[1];
    const signatureValue = signatureHash.split('=')[1];
    
    if (!timestampValue || !signatureValue) {
      return false;
    }
    
    // Check if the timestamp is recent (within 5 minutes)
    const timestampDate = new Date(parseInt(timestampValue) * 1000);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    if (timestampDate < fiveMinutesAgo) {
      console.error('Webhook timestamp is too old');
      return false;
    }
    
    // Create the signature payload
    const payload = `${timestampValue}.${JSON.stringify(body)}`;
    
    // Calculate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    // Compare the signatures
    return crypto.timingSafeEqual(
      Buffer.from(signatureValue),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};
