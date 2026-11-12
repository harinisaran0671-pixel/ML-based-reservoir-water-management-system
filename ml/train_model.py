"""
AquaPredict AI - Model Training and Evaluation Pipeline
Trains Linear Regression, Random Forest, and Gradient Boosting Regressors.
Selects best model based on validation RMSE.
Saves model artifacts and metrics.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.preprocess import add_features, chronological_split, PreprocessingPipeline, FEATURE_COLS, TARGET_COL

def calculate_mape(y_true, y_pred) -> float:
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    nonzero_mask = y_true != 0
    if not np.any(nonzero_mask):
        return 0.0
    return float(np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100.0)

def evaluate_predictions(y_true, y_pred) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    mape = calculate_mape(y_true, y_pred)
    return {
        "MAE": round(float(mae), 3),
        "RMSE": round(float(rmse), 3),
        "R2": round(float(r2), 4),
        "MAPE": round(float(mape), 2)
    }

def train_and_evaluate(data_path: str = "data/water_demand_reservoir_dataset.csv", output_dir: str = "models"):
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(data_path):
        from data.generate_dataset import generate_records
        print("Dataset not found, generating...")
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df_gen = generate_records(3659)
        df_gen.to_csv(data_path, index=False)

    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"Records loaded: {len(df)}")

    # Feature Engineering
    df_feat = add_features(df)

    # Chronological Split
    train_df, val_df, test_df = chronological_split(df_feat, train_ratio=0.70, val_ratio=0.15)
    print(f"Train set: {len(train_df)} | Val set: {len(val_df)} | Test set: {len(test_df)}")

    # Preprocessing
    pipeline = PreprocessingPipeline()
    pipeline.fit(train_df)
    pipeline.save(os.path.join(output_dir, "preprocessing.pkl"))

    X_train = pipeline.transform(train_df)
    y_train = train_df[TARGET_COL].values

    X_val = pipeline.transform(val_df)
    y_val = val_df[TARGET_COL].values

    X_test = pipeline.transform(test_df)
    y_test = test_df[TARGET_COL].values

    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=150, learning_rate=0.08, max_depth=6, random_state=42)
    }

    metrics_summary = {}
    best_val_rmse = float("inf")
    best_model_name = None
    best_model_obj = None

    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)

        val_pred = model.predict(X_val)
        test_pred = model.predict(X_test)

        val_metrics = evaluate_predictions(y_val, val_pred)
        test_metrics = evaluate_predictions(y_test, test_pred)

        metrics_summary[name] = {
            "validation": val_metrics,
            "test": test_metrics
        }
        print(f"  [{name}] Val RMSE: {val_metrics['RMSE']}, Test R2: {test_metrics['R2']}, Test MAPE: {test_metrics['MAPE']}%")

        if val_metrics["RMSE"] < best_val_rmse:
            best_val_rmse = val_metrics["RMSE"]
            best_model_name = name
            best_model_obj = model

    print(f"\nBest model selected based on Validation RMSE: {best_model_name}")

    # Retrain best model on combined train+val for deployment
    X_train_val = np.vstack([X_train, X_val])
    y_train_val = np.concatenate([y_train, y_val])
    best_model_obj.fit(X_train_val, y_train_val)

    # Final test evaluation of deployed model
    final_test_pred = best_model_obj.predict(X_test)
    final_test_metrics = evaluate_predictions(y_test, final_test_pred)
    print(f"Final Test Evaluation: R2 = {final_test_metrics['R2']}, MAPE = {final_test_metrics['MAPE']}%, RMSE = {final_test_metrics['RMSE']}")

    # Save best model
    model_save_path = os.path.join(output_dir, "best_water_demand_model.pkl")
    joblib.dump(best_model_obj, model_save_path)
    print(f"Saved best model to {model_save_path}")

    # Train Inflow Prediction Model
    print("Training Inflow Model...")
    inflow_features = ["rainfall_mm", "month", "quarter", "reservoir_capacity_mcm", "current_storage_mcm", "temp_rain_ratio"]
    for s in ["Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Tamil Nadu", "Telangana"]:
        inflow_features.append(f"state_{s}")
    for sn in ["Monsoon", "Post-Monsoon", "Summer", "Winter"]:
        inflow_features.append(f"season_{sn}")

    X_inflow_train = train_df[inflow_features].values
    y_inflow_train = train_df["inflow_mcm"].values
    inflow_model = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
    inflow_model.fit(X_inflow_train, y_inflow_train)
    joblib.dump({"model": inflow_model, "features": inflow_features}, os.path.join(output_dir, "inflow_model.pkl"))

    # Feature Importance (for Gradient Boosting or Random Forest)
    feature_importances = {}
    if hasattr(best_model_obj, "feature_importances_"):
        importances = best_model_obj.feature_importances_
        feature_names = pipeline.feature_cols
        indices = np.argsort(importances)[::-1]
        for idx in indices:
            feature_importances[feature_names[idx]] = round(float(importances[idx]), 4)

    # Save metrics JSON
    metrics_data = {
        "best_model": best_model_name,
        "selection_criterion": "Lowest Validation RMSE on Chronological Split",
        "evaluation_strategy": "Chronological train (70%) / validation (15%) / test (15%) without random shuffle to eliminate lookahead leakage.",
        "models": metrics_summary,
        "final_deployed_test_metrics": final_test_metrics,
        "feature_importances": feature_importances,
        "known_limitations": [
            "Tree-based regressors (Random Forest, Gradient Boosting) do not extrapolate unbounded population changes strongly.",
            "Temperature scenario input accepts delta in Celsius (°C), not percentage.",
            "Dataset is DEMO/SYNTHETIC and meant for prototype decision support demonstration."
        ]
    }

    with open(os.path.join(output_dir, "model_metrics.json"), "w") as f:
        json.dump(metrics_data, f, indent=2)

    # Generate Evaluation Charts
    print("Generating evaluation plots...")
    # 1. Actual vs Predicted
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, final_test_pred, alpha=0.4, color="#0284c7", edgecolors="none", s=25)
    p_min = min(y_test.min(), final_test_pred.min())
    p_max = max(y_test.max(), final_test_pred.max())
    plt.plot([p_min, p_max], [p_min, p_max], "r--", lw=2, label="Ideal 1:1 Line")
    plt.title(f"Actual vs Predicted Water Demand (Test Set: R²={final_test_metrics['R2']})", fontsize=12, fontweight="bold")
    plt.xlabel("Actual Total Water Demand (MCM)")
    plt.ylabel("Predicted Water Demand (MCM)")
    plt.legend()
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "actual_vs_predicted.png"), dpi=150)
    plt.close()

    # 2. Model Comparison
    plt.figure(figsize=(9, 5))
    m_names = list(metrics_summary.keys())
    r2_vals = [metrics_summary[m]["test"]["R2"] for m in m_names]
    mape_vals = [metrics_summary[m]["test"]["MAPE"] for m in m_names]

    x = np.arange(len(m_names))
    width = 0.35
    fig, ax1 = plt.subplots(figsize=(8, 5))
    ax2 = ax1.twinx()
    rects1 = ax1.bar(x - width/2, r2_vals, width, label="Test R²", color="#0284c7")
    rects2 = ax2.bar(x + width/2, mape_vals, width, label="Test MAPE (%)", color="#f97316")

    ax1.set_ylabel("R² Score", color="#0284c7", fontweight="bold")
    ax2.set_ylabel("MAPE (%)", color="#f97316", fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(m_names, fontweight="bold")
    ax1.set_title("Model Comparison on Chronological Test Set", fontsize=12, fontweight="bold")
    ax1.set_ylim(0, 1.05)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "model_comparison.png"), dpi=150)
    plt.close()

    # 3. Top 10 Feature Importances
    if feature_importances:
        top_k = list(feature_importances.items())[:10]
        f_names = [k[0] for k in top_k][::-1]
        f_scores = [k[1] for k in top_k][::-1]

        plt.figure(figsize=(9, 6))
        plt.barh(f_names, f_scores, color="#059669")
        plt.title(f"Top 10 Feature Importances ({best_model_name})", fontsize=12, fontweight="bold")
        plt.xlabel("Relative Importance Score")
        plt.grid(True, linestyle=":", alpha=0.6)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, "feature_importance.png"), dpi=150)
        plt.close()

    print("Training and evaluation complete!")
    return metrics_data

if __name__ == "__main__":
    train_and_evaluate()
