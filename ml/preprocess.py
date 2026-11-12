"""
AquaPredict AI - Preprocessing and Feature Engineering Pipeline
Handles temporal features, lag/rolling features, categorical encoding, and chronological splitting.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from sklearn.preprocessing import StandardScaler, OneHotEncoder

FEATURE_COLS = [
    "population",
    "rainfall_mm",
    "temperature_c",
    "agricultural_area_ha",
    "reservoir_capacity_mcm",
    "current_storage_mcm",
    "storage_percentage",
    "industrial_demand_mcm",
    "month",
    "quarter",
    "lag_1_demand",
    "lag_3_demand",
    "lag_6_demand",
    "lag_12_demand",
    "rolling_mean_3_demand",
    "rolling_std_3_demand",
    "temp_rain_ratio",
    "state_Andhra Pradesh",
    "state_Karnataka",
    "state_Kerala",
    "state_Maharashtra",
    "state_Tamil Nadu",
    "state_Telangana",
    "season_Monsoon",
    "season_Post-Monsoon",
    "season_Summer",
    "season_Winter"
]

TARGET_COL = "total_water_demand_mcm"

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer temporal, lag, rolling and interaction features."""
    data = df.copy()
    data["date"] = pd.to_datetime(data["date"])
    data = data.sort_values(by=["reservoir_name", "date"]).reset_index(drop=True)

    data["year"] = data["date"].dt.year
    data["month"] = data["date"].dt.month
    data["quarter"] = data["date"].dt.quarter

    # Lags & rolling demand per reservoir
    def calc_group_features(g):
        g = g.sort_values("date")
        g["lag_1_demand"] = g["total_water_demand_mcm"].shift(1)
        g["lag_3_demand"] = g["total_water_demand_mcm"].shift(3)
        g["lag_6_demand"] = g["total_water_demand_mcm"].shift(6)
        g["lag_12_demand"] = g["total_water_demand_mcm"].shift(12)
        g["rolling_mean_3_demand"] = g["total_water_demand_mcm"].shift(1).rolling(window=3, min_periods=1).mean()
        g["rolling_std_3_demand"] = g["total_water_demand_mcm"].shift(1).rolling(window=3, min_periods=1).std().fillna(0)
        return g

    data = data.groupby("reservoir_name", group_keys=False).apply(calc_group_features)

    # Fill initial NaNs with backward-fill or mean
    data["lag_1_demand"] = data["lag_1_demand"].bfill().fillna(data["total_water_demand_mcm"])
    data["lag_3_demand"] = data["lag_3_demand"].bfill().fillna(data["total_water_demand_mcm"])
    data["lag_6_demand"] = data["lag_6_demand"].bfill().fillna(data["total_water_demand_mcm"])
    data["lag_12_demand"] = data["lag_12_demand"].bfill().fillna(data["total_water_demand_mcm"])
    data["rolling_mean_3_demand"] = data["rolling_mean_3_demand"].bfill().fillna(data["total_water_demand_mcm"])
    data["rolling_std_3_demand"] = data["rolling_std_3_demand"].fillna(0)

    # Interaction
    data["temp_rain_ratio"] = data["temperature_c"] / (data["rainfall_mm"] + 10.0)

    # Dummy encoding for state and season
    states = ["Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Tamil Nadu", "Telangana"]
    for s in states:
        data[f"state_{s}"] = (data["state"] == s).astype(float)

    seasons = ["Monsoon", "Post-Monsoon", "Summer", "Winter"]
    for sn in seasons:
        data[f"season_{sn}"] = (data["season"] == sn).astype(float)

    # Ensure storage percentage
    if "storage_percentage" not in data.columns or data["storage_percentage"].isna().any():
        data["storage_percentage"] = (data["current_storage_mcm"] / data["reservoir_capacity_mcm"]) * 100.0

    return data

def chronological_split(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15):
    """
    Split time series chronologically by unique dates across all reservoirs.
    Crucial for real-world temporal validity (no data leakage).
    """
    unique_dates = np.sort(df["date"].unique())
    n_dates = len(unique_dates)
    train_end = int(n_dates * train_ratio)
    val_end = int(n_dates * (train_ratio + val_ratio))

    train_dates = set(unique_dates[:train_end])
    val_dates = set(unique_dates[train_end:val_end])
    test_dates = set(unique_dates[val_end:])

    train_df = df[df["date"].isin(train_dates)].copy()
    val_df = df[df["date"].isin(val_dates)].copy()
    test_df = df[df["date"].isin(test_dates)].copy()

    return train_df, val_df, test_df

class PreprocessingPipeline:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_cols = FEATURE_COLS
        self.is_fitted = False

    def fit(self, X: pd.DataFrame):
        self.scaler.fit(X[self.feature_cols])
        self.is_fitted = True
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Pipeline has not been fitted.")
        # Ensure all columns exist
        df_copy = X.copy()
        for col in self.feature_cols:
            if col not in df_copy.columns:
                df_copy[col] = 0.0
        return self.scaler.transform(df_copy[self.feature_cols])

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        self.fit(X)
        return self.transform(X)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> "PreprocessingPipeline":
        return joblib.load(filepath)
