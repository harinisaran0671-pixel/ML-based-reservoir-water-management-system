"""
AquaPredict AI - Model Evaluation Verification Script
Inspects models/model_metrics.json and outputs the verified validation & test metrics.
"""

import os
import json

def display_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "..", "models", "model_metrics.json")
    if not os.path.exists(metrics_path):
        print(f"Metrics file not found at {metrics_path}. Run ml/train_model.py first.")
        return

    with open(metrics_path, "r") as f:
        data = json.load(f)

    print("=" * 60)
    print("AQUAPREDICT AI - MACHINE LEARNING MODEL EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Selected Best Model : {data.get('best_model')}")
    print(f"Selection Criterion : {data.get('selection_criterion')}")
    print(f"Evaluation Strategy : {data.get('evaluation_strategy')}")
    print("-" * 60)
    print(f"{'Model':<22} | {'Val RMSE':<10} | {'Test R²':<10} | {'Test MAPE':<10}")
    print("-" * 60)
    for model_name, res in data.get("models", {}).items():
        val_rmse = res.get("validation", {}).get("RMSE", "N/A")
        test_r2 = res.get("test", {}).get("R2", "N/A")
        test_mape = res.get("test", {}).get("MAPE", "N/A")
        print(f"{model_name:<22} | {val_rmse:<10} | {test_r2:<10} | {test_mape:<10}%")
    print("-" * 60)

    final = data.get("final_deployed_test_metrics", {})
    print(f"Deployed Test Metrics: R² = {final.get('R2')}, MAPE = {final.get('MAPE')}%, RMSE = {final.get('RMSE')}")
    print("=" * 60)

if __name__ == "__main__":
    display_metrics()
