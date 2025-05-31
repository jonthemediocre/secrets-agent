import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from '../utils/ErrorHandler';
import { ErrorSeverity, ErrorCategory, SyncError, SecurityError, BaseError } from '../utils/error-types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('Error Classification', () => {
    it('should correctly classify filesystem errors', async () => {
      const errorSpy = vi.fn();
      errorHandler.on('error_handled', errorSpy);

      await errorHandler.handleError({
        component: 'test',
        originalError: new Error('ENOENT: file not found')
      });

      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0][0];
      expect(call.error.classification.category).toBe(ErrorCategory.FILESYSTEM);
      expect(call.error.classification.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should correctly classify network errors', async () => {
      const errorSpy = vi.fn();
      errorHandler.on('error_handled', errorSpy);

      await errorHandler.handleError({
        component: 'test',
        originalError: new Error('ETIMEDOUT: connection timed out')
      });

      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0][0];
      expect(call.error.classification.category).toBe(ErrorCategory.NETWORK);
      expect(call.error.classification.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle custom SyncErrors with their classifications', async () => {
      const errorSpy = vi.fn();
      errorHandler.on('error_handled', errorSpy);

      const syncError = new SyncError('Custom sync error', {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYNC,
        recoverable: false
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: syncError
      });

      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0][0];
      expect(call.error.classification.category).toBe(ErrorCategory.SYNC);
      expect(call.error.classification.severity).toBe(ErrorSeverity.HIGH);
      expect(call.error.classification.recoverable).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle BaseError instances', async () => {
      const error = new BaseError('Test error', {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYNC
      });

      const errorPromise = new Promise<void>((resolve) => {
        errorHandler.once('error_handled', ({ error: handledError }) => {
          expect(handledError).toBe(error);
          resolve();
        });
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: error
      });

      await errorPromise;
    });

    it('should convert regular Error to BaseError', async () => {
      const originalError = new Error('Test error');

      const errorPromise = new Promise<void>((resolve) => {
        errorHandler.once('error_handled', ({ error }) => {
          expect(error).toBeInstanceOf(BaseError);
          expect(error.message).toBe(originalError.message);
          expect(error.classification.severity).toBe(ErrorSeverity.MEDIUM);
          expect(error.classification.category).toBe(ErrorCategory.UNKNOWN);
          resolve();
        });
      });

      await errorHandler.handleError({
        component: 'test',
        originalError
      });

      await errorPromise;
    });

    it('should emit human_intervention_needed for appropriate errors', async () => {
      const error = new BaseError('Critical error', {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SECURITY,
        requiresHumanIntervention: true
      });

      const interventionPromise = new Promise<void>((resolve) => {
        errorHandler.once('human_intervention_needed', ({ error: handledError }) => {
          expect(handledError).toBe(error);
          resolve();
        });
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: error
      });

      await interventionPromise;
    });
  });

  describe('Error Retrieval', () => {
    it('should get error by ID', async () => {
      const error = new BaseError('Test error');
      
      const errorPromise = new Promise<string>((resolve) => {
        errorHandler.once('error_handled', ({ id }) => {
          resolve(id);
        });
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: error
      });

      const errorId = await errorPromise;
      const retrievedError = errorHandler.getError(errorId);
      expect(retrievedError).toBe(error);
    });

    it('should get errors by category', async () => {
      const syncError = new BaseError('Sync error', {
        category: ErrorCategory.SYNC
      });

      const securityError = new BaseError('Security error', {
        category: ErrorCategory.SECURITY
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: syncError
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: securityError
      });

      const syncErrors = errorHandler.getErrorsByCategory(ErrorCategory.SYNC);
      expect(syncErrors).toHaveLength(1);
      expect(syncErrors[0]).toBe(syncError);

      const securityErrors = errorHandler.getErrorsByCategory(ErrorCategory.SECURITY);
      expect(securityErrors).toHaveLength(1);
      expect(securityErrors[0]).toBe(securityError);
    });

    it('should get errors by severity', async () => {
      const mediumError = new BaseError('Medium error', {
        severity: ErrorSeverity.MEDIUM
      });

      const criticalError = new BaseError('Critical error', {
        severity: ErrorSeverity.CRITICAL
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: mediumError
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: criticalError
      });

      const mediumErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.MEDIUM);
      expect(mediumErrors).toHaveLength(1);
      expect(mediumErrors[0]).toBe(mediumError);

      const criticalErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.CRITICAL);
      expect(criticalErrors).toHaveLength(1);
      expect(criticalErrors[0]).toBe(criticalError);
    });
  });

  describe('Error Stats', () => {
    it('should track error statistics correctly', async () => {
      const error1 = new BaseError('Error 1', {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYNC,
        recoverable: true
      });

      const error2 = new BaseError('Error 2', {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SECURITY,
        recoverable: false,
        requiresHumanIntervention: true
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: error1
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: error2
      });

      const stats = errorHandler.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byCategory[ErrorCategory.SYNC]).toBe(1);
      expect(stats.byCategory[ErrorCategory.SECURITY]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(stats.recoverable).toBe(1);
      expect(stats.requiresHumanIntervention).toBe(1);
    });
  });

  describe('Error Management', () => {
    it('should clear errors', async () => {
      const error = new BaseError('Test error');

      await errorHandler.handleError({
        component: 'test',
        originalError: error
      });

      const clearPromise = new Promise<void>((resolve) => {
        errorHandler.once('errors_cleared', () => {
          resolve();
        });
      });

      errorHandler.clearErrors();
      await clearPromise;

      const stats = errorHandler.getStats();
      expect(stats.total).toBe(0);
      expect(errorHandler.getErrors()).toHaveLength(0);
    });

    it('should retry recoverable errors', async () => {
      const recoverableError = new BaseError('Recoverable error', {
        recoverable: true
      });

      const unrecoverableError = new BaseError('Unrecoverable error', {
        recoverable: false
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: recoverableError
      });

      await errorHandler.handleError({
        component: 'test',
        originalError: unrecoverableError
      });

      const retryPromise = new Promise<void>((resolve) => {
        let retryCount = 0;
        errorHandler.on('retry_error', (error) => {
          expect(error).toBe(recoverableError);
          retryCount++;
          if (retryCount === 1) {
            resolve();
          }
        });
      });

      await errorHandler.retryRecoverableErrors();
      await retryPromise;
    });
  });
}); 