# tests/test_ml.py
# -----------------------------------------------------------
# Unit tests for the ML training and prediction pipeline
# -----------------------------------------------------------

import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Override model paths to a temp directory so tests don't
# interfere with real trained models
import config
_tmpdir = tempfile.mkdtemp()
config.MODEL_PATH  = os.path.join(_tmpdir, "model.pkl")
config.SCALER_PATH = os.path.join(_tmpdir, "scaler.pkl")

from ml.train   import generate_dataset, train
from ml.predict import predict, predict_batch


def setup_module():
    """Train a small model before running prediction tests."""
    train()


def teardown_module():
    """Clean up temporary model files."""
    shutil.rmtree(_tmpdir, ignore_errors=True)


def test_dataset_shape():
    X, y = generate_dataset(n_samples=200)
    assert X.shape == (200, 6)
    assert y.shape == (200,)
    assert set(y).issubset({0, 1, 2})


def test_dataset_has_all_classes():
    X, y = generate_dataset(n_samples=500)
    assert 0 in y, "Normal class missing from dataset"
    assert 1 in y, "Warning class missing from dataset"
    assert 2 in y, "Alert class missing from dataset"


def test_predict_normal():
    result = predict(0.25, 0.20, 0.22, 8, 3, 0)
    assert "prediction"  in result
    assert "label"       in result
    assert "confidence"  in result
    assert result["label"] in ("Normal", "Warning", "Alert")
    assert 0.0 <= result["confidence"] <= 1.0


def test_predict_returns_alert_for_extreme_values():
    """Extreme EMG + pitch values should predict Alert."""
    result = predict(0.95, 0.90, 0.92, 45, 5, 1300)
    assert result["label"] == "Alert"


def test_predict_returns_normal_for_safe_values():
    """Clearly safe readings (well below all thresholds) should predict Normal."""
    result = predict(0.05, 0.04, 0.05, 2, 1, 0)
    assert result["label"] == "Normal"


def test_predict_batch():
    readings = [
        {"emg_upper_trap": 0.05, "emg_scm": 0.04, "emg_levator": 0.05,
         "pitch": 2,  "roll": 1, "duration_poor_posture": 0},
        {"emg_upper_trap": 0.90, "emg_scm": 0.85, "emg_levator": 0.88,
         "pitch": 45, "roll": 5, "duration_poor_posture": 1300},
    ]
    results = predict_batch(readings)
    assert len(results) == 2
    assert results[0]["label"] == "Normal"
    assert results[1]["label"] == "Alert"
