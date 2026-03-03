import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'madas-functions' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

/**
 * Log system event to Firestore
 */
export const logSystemEvent = async (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  category: 'auth' | 'payment' | 'website' | 'system' | 'security',
  metadata?: Record<string, any>,
  userId?: string
) => {
  try {
    const logEntry = {
      level,
      message,
      category,
      userId,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'functions',
    };

    // Log to Winston
    logger.log(level, message, { category, userId, metadata });

    // Store in Firestore
    await admin.firestore()
      .collection('system_logs')
      .add(logEntry);

    // Also log to Firebase Functions logger
    switch (level) {
      case 'error':
        functions.logger.error(message, { category, userId, metadata });
        break;
      case 'warn':
        functions.logger.warn(message, { category, userId, metadata });
        break;
      case 'debug':
        functions.logger.debug(message, { category, userId, metadata });
        break;
      default:
        functions.logger.info(message, { category, userId, metadata });
    }
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
};

/**
 * Log user activity
 */
export const logUserActivity = async (
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    const activityLog = {
      userId,
      action,
      resource,
      resourceId,
      details: details || {},
      ipAddress,
      userAgent,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore()
      .collection('user_activity')
      .add(activityLog);

    logger.info('User activity logged', {
      userId,
      action,
      resource,
      resourceId,
    });
  } catch (error) {
    logger.error('Failed to log user activity:', error);
  }
};

/**
 * Log webhook event
 */
export const logWebhookEvent = async (
  eventId: string,
  eventType: string,
  processed: boolean,
  success: boolean,
  error?: string,
  data?: any
) => {
  try {
    const webhookLog = {
      eventId,
      eventType,
      processed,
      success,
      error,
      data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore()
      .collection('webhook_logs')
      .add(webhookLog);

    logger.info('Webhook event logged', {
      eventId,
      eventType,
      processed,
      success,
    });
  } catch (error) {
    logger.error('Failed to log webhook event:', error);
  }
};

/**
 * Log security event
 */
export const logSecurityEvent = async (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
) => {
  try {
    const securityLog = {
      event,
      severity,
      userId,
      ipAddress,
      userAgent,
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore()
      .collection('security_logs')
      .add(securityLog);

    logger.warn('Security event logged', {
      event,
      severity,
      userId,
      ipAddress,
    });

    // Send alert for high/critical severity
    if (severity === 'high' || severity === 'critical') {
      await sendSecurityAlert(securityLog);
    }
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

/**
 * Send security alert
 */
const sendSecurityAlert = async (securityLog: any) => {
  try {
    // Send email notification to admins
    const admins = await admin.firestore()
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    for (const adminDoc of admins.docs) {
      const adminData = adminDoc.data();
      if (adminData.email) {
        // TODO: Send email notification
        logger.info('Security alert sent to admin', {
          adminEmail: adminData.email,
          event: securityLog.event,
          severity: securityLog.severity,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to send security alert:', error);
  }
};

/**
 * Log performance metrics
 */
export const logPerformanceMetrics = async (
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
) => {
  try {
    const metricsLog = {
      operation,
      duration,
      success,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore()
      .collection('performance_logs')
      .add(metricsLog);

    logger.info('Performance metrics logged', {
      operation,
      duration,
      success,
    });
  } catch (error) {
    logger.error('Failed to log performance metrics:', error);
  }
};

/**
 * Log API request
 */
export const logApiRequest = async (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    const requestLog = {
      method,
      path,
      statusCode,
      duration,
      userId,
      ipAddress,
      userAgent,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore()
      .collection('api_logs')
      .add(requestLog);

    logger.info('API request logged', {
      method,
      path,
      statusCode,
      duration,
      userId,
    });
  } catch (error) {
    logger.error('Failed to log API request:', error);
  }
};

/**
 * Error handler middleware
 */
export const errorHandler = (error: any, req: any, res: any, next: any) => {
  // Log error
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.uid,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Log to Firestore
  logSystemEvent(
    'error',
    error.message,
    'system',
    {
      stack: error.stack,
      url: req.url,
      method: req.method,
      userId: req.uid,
    },
    req.uid
  );

  // Send response
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export default logger;
