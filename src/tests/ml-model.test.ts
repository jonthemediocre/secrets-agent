import { MLModel } from '../ml/MLModel';
import { MLPrediction } from '../sync/interfaces';
import { BaseError } from '../utils/error-types';

describe('MLModel', () => {
  let model: MLModel;

  beforeEach(() => {
    model = new MLModel();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(model.initialize()).resolves.not.toThrow();
      expect(model.getModelState().isInitialized).toBe(true);
    });
  });

  describe('predictSyncBehavior', () => {
    beforeEach(async () => {
      await model.initialize();
    });

    it('should return valid prediction for a file path', async () => {
      const prediction = await model.predictSyncBehavior('/test/file.txt');
      expect(prediction).toHaveProperty('syncBehavior');
      expect(prediction.syncBehavior).toHaveProperty('mode');
      expect(prediction.syncBehavior).toHaveProperty('priority');
      expect(prediction.syncBehavior).toHaveProperty('probability');
    });

    it('should return default prediction when not initialized', async () => {
      const uninitializedModel = new MLModel();
      const prediction = await uninitializedModel.predictSyncBehavior('/test/file.txt');
      expect(prediction.syncBehavior.mode).toBe('batch');
      expect(prediction.syncBehavior.priority).toBe(1);
      expect(prediction.syncBehavior.probability).toBe(0.5);
    });
  });

  describe('predictRecoveryStrategy', () => {
    beforeEach(async () => {
      await model.initialize();
    });

    it('should return valid recovery strategy', async () => {
      const strategy = await model.predictRecoveryStrategy('/test/file.txt');
      expect(strategy).toHaveProperty('actions');
      expect(strategy).toHaveProperty('confidence');
      expect(Array.isArray(strategy.actions)).toBe(true);
    });
  });

  describe('updateFromFailure', () => {
    beforeEach(async () => {
      await model.initialize();
    });

    it('should process failure data correctly', async () => {
      const failureData = {
        path: '/test/file.txt',
        error: new Error('Test error'),
        recovery: { action: 'retry' }
      };

      await expect(model.updateFromFailure(failureData)).resolves.not.toThrow();
    });

    it('should update model after collecting enough samples', async () => {
      const failureData = {
        path: '/test/file.txt',
        error: new Error('Test error'),
        recovery: { action: 'retry' }
      };

      // Update 10 times to trigger model update
      for (let i = 0; i < 10; i++) {
        await model.updateFromFailure(failureData);
      }

      const state = model.getModelState();
      expect(state.samplesProcessed).toBeGreaterThan(0);
      expect(state.lastTrainingTime).toBeDefined();
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await model.initialize();
    });

    it('should emit prediction events', (done) => {
      model.once('prediction_made', (data) => {
        expect(data).toHaveProperty('path');
        expect(data).toHaveProperty('features');
        expect(data).toHaveProperty('prediction');
        done();
      });

      model.predictSyncBehavior('/test/file.txt');
    });

    it('should emit failure processing events', (done) => {
      model.once('failure_processed', (data) => {
        expect(data).toHaveProperty('path');
        expect(data).toHaveProperty('features');
        expect(data).toHaveProperty('error');
        done();
      });

      model.updateFromFailure({
        path: '/test/file.txt',
        error: new Error('Test error'),
        recovery: { action: 'retry' }
      });
    });
  });
}); 