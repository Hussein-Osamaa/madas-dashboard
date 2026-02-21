import mongoose from 'mongoose';
import { StockTransactionModel, type IStockTransaction, type StockTransactionType } from '../models/StockTransaction.model';
import { WarehouseStockModel } from '../models/WarehouseStock.model';

export class StockTransactionRepository {
  async create(
    data: { productId: string; clientId: string; type: StockTransactionType; quantity: number; referenceId?: string; month: string },
    session?: mongoose.ClientSession
  ) {
    const [doc] = await StockTransactionModel.create([data], { session });
    return doc;
  }

  async findByProductClient(
    productId: string,
    clientId: string,
    opts?: { limit?: number; skip?: number }
  ) {
    const q = StockTransactionModel.find({ productId, clientId }).sort({ createdAt: -1 });
    if (opts?.skip) q.skip(opts.skip);
    if (opts?.limit) q.limit(opts.limit);
    return q.lean();
  }

  async countByProductClient(productId: string, clientId: string): Promise<number> {
    return StockTransactionModel.countDocuments({ productId, clientId });
  }

  async aggregateByType(productId: string, clientId: string) {
    return StockTransactionModel.aggregate([
      { $match: { productId, clientId } },
      { $group: { _id: '$type', total: { $sum: '$quantity' } } },
    ]);
  }
}
