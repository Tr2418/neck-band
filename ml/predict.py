# ml/predict.py
# -----------------------------------------------------------
# CervicalSentinel – Model Prediction
#
# Loads the saved Decision Tree model and scaler, then
# provides a simple `predict()` function used by the API
# and the threshold module.
# -----------------------------------------------------------

import os
import sys

# Allow imports from project root when running as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
import numpy as np
import joblib

from config import LABEL_NAMES

# Module-level cache so we load the files only once
_model        = None
_scaler       = None
_loaded_paths = (None, None)  # (model_path, scaler_path) that were loaded


def _load():
    """Load model and scaler from disk (cached per path)."""
    global _model, _scaler, _loaded_paths
    model_path  = config.MODEL_PATH
    scaler_path = config.SCALER_PATH
    if (model_path, scaler_path) != _loaded_paths:
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model file not found: {model_path}\n"
                "Please run:  python ml/train.py"
            )
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(
                f"Scaler file not found: {scaler_path}\n"
                "Please run:  python ml/train.py"
            )
        _model  = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)
        _loaded_paths = (model_path, scaler_path)
    return _model, _scaler


def predict(emg_upper_trap, emg_scm, emg_levator,
            pitch, roll, duration_poor_posture=0):
    """
    Classify a single sensor reading.

    Parameters
    ----------
    emg_upper_trap        : float  0.0 – 1.0
    emg_scm               : float  0.0 – 1.0
    emg_levator           : float  0.0 – 1.0
    pitch                 : float  degrees
    roll                  : float  degrees
    duration_poor_posture : int    seconds

    Returns
    -------
    dict
        {
          "prediction" : int   (0=Normal, 1=Warning, 2=Alert),
          "label"      : str   ("Normal" / "Warning" / "Alert"),
          "confidence" : float (0.0 – 1.0)
        }

    Example
    -------
    >>> result = predict(0.3, 0.2, 0.25, 10, 5, 0)
    >>> result["label"]
    'Normal'
    """
    model, scaler = _load()

    features = np.array([[
        emg_upper_trap, emg_scm, emg_levator,
        pitch, roll, duration_poor_posture
    ]])
    features_scaled = scaler.transform(features)

    prediction  = int(model.predict(features_scaled)[0])
    probabilities = model.predict_proba(features_scaled)[0]
    confidence  = float(probabilities[prediction])

    return {
        "prediction": prediction,
        "label":      LABEL_NAMES[prediction],
        "confidence": round(confidence, 4),
    }


def predict_batch(readings):
    """
    Classify a list of readings at once.

    Parameters
    ----------
    readings : list of dict
        Each dict must have keys:
        emg_upper_trap, emg_scm, emg_levator, pitch, roll,
        duration_poor_posture

    Returns
    -------
    list of dict  (same format as ``predict()``)
    """
    model, scaler = _load()

    X = np.array([[
        r["emg_upper_trap"], r["emg_scm"], r["emg_levator"],
        r["pitch"], r["roll"], r.get("duration_poor_posture", 0)
    ] for r in readings])

    X_scaled     = scaler.transform(X)
    predictions  = model.predict(X_scaled).tolist()
    probabilities = model.predict_proba(X_scaled).tolist()

    results = []
    for pred, probs in zip(predictions, probabilities):
        results.append({
            "prediction": int(pred),
            "label":      LABEL_NAMES[int(pred)],
            "confidence": round(probs[int(pred)], 4),
        })
    return results
