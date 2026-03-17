# ml/train.py
# -----------------------------------------------------------
# CervicalSentinel – Machine-Learning Model Training
#
# This script:
#  1. Generates a labelled training dataset based on the
#     physiological rules described in the project spec.
#  2. Trains a Decision Tree classifier (easy to understand,
#     fast, and interpretable – great for beginners).
#  3. Saves the trained model and scaler to disk so that the
#     Flask API can load them without retraining.
#
# Run:
#   python ml/train.py
# -----------------------------------------------------------

import os
import sys

# Allow imports from project root when running as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
import numpy as np
import joblib
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

from config import (
    EMG_WARNING_THRESHOLD, EMG_ALERT_THRESHOLD,
    PITCH_WARNING_THRESHOLD, PITCH_ALERT_THRESHOLD,
    ROLL_WARNING_THRESHOLD, ROLL_ALERT_THRESHOLD,
    POOR_POSTURE_DURATION_WARNING, POOR_POSTURE_DURATION_ALERT,
    LABEL_NORMAL, LABEL_WARNING, LABEL_ALERT, LABEL_NAMES,
)

# ── Random seed for reproducibility ──────────────────────────
np.random.seed(42)

# ── Feature names ─────────────────────────────────────────────
FEATURE_NAMES = [
    "emg_upper_trap",        # EMG from upper trapezius  (0.0–1.0)
    "emg_scm",               # EMG from SCM muscle       (0.0–1.0)
    "emg_levator",           # EMG from levator scapulae (0.0–1.0)
    "pitch",                 # Neck forward/back angle   (degrees)
    "roll",                  # Neck side tilt angle      (degrees)
    "duration_poor_posture", # Consecutive seconds in poor posture
]

N_SAMPLES = 10000  # total synthetic samples to generate

# Target class distribution in the training set
_CLASS_RATIOS = {
    LABEL_NORMAL:  0.60,   # 60 % – most of the time posture is OK
    LABEL_WARNING: 0.25,   # 25 % – mild strain / poor posture
    LABEL_ALERT:   0.15,   # 15 % – severe strain / poor posture
}


def _sample_normal():
    """Generate one Normal-class feature vector."""
    emg_upper_trap = np.random.uniform(0.0, EMG_WARNING_THRESHOLD - 0.01)
    emg_scm        = np.random.uniform(0.0, EMG_WARNING_THRESHOLD - 0.01)
    emg_levator    = np.random.uniform(0.0, EMG_WARNING_THRESHOLD - 0.01)
    pitch          = np.random.uniform(-10, PITCH_WARNING_THRESHOLD - 1)
    roll           = np.random.uniform(-ROLL_WARNING_THRESHOLD + 1,
                                        ROLL_WARNING_THRESHOLD - 1)
    duration       = np.random.randint(0, POOR_POSTURE_DURATION_WARNING)
    return [emg_upper_trap, emg_scm, emg_levator, pitch, roll, duration]


def _sample_warning():
    """Generate one Warning-class feature vector (at least one warning trigger)."""
    # Randomly choose which trigger causes the Warning
    trigger = np.random.choice(["emg", "pitch", "roll", "duration"])

    emg_upper_trap = np.random.uniform(0.0, 0.55)
    emg_scm        = np.random.uniform(0.0, 0.55)
    emg_levator    = np.random.uniform(0.0, 0.55)
    pitch          = np.random.uniform(-10, PITCH_WARNING_THRESHOLD - 1)
    roll           = np.random.uniform(-(ROLL_WARNING_THRESHOLD - 1),
                                         ROLL_WARNING_THRESHOLD - 1)
    duration       = np.random.randint(0, POOR_POSTURE_DURATION_WARNING)

    if trigger == "emg":
        lead = np.random.uniform(EMG_WARNING_THRESHOLD,
                                  EMG_ALERT_THRESHOLD - 0.01)
        emg_upper_trap = lead
    elif trigger == "pitch":
        pitch = np.random.uniform(PITCH_WARNING_THRESHOLD,
                                   PITCH_ALERT_THRESHOLD - 1)
    elif trigger == "roll":
        roll = np.random.uniform(ROLL_WARNING_THRESHOLD,
                                  ROLL_ALERT_THRESHOLD - 1)
        if np.random.random() < 0.5:
            roll = -roll
    else:
        duration = np.random.randint(POOR_POSTURE_DURATION_WARNING,
                                      POOR_POSTURE_DURATION_ALERT)
    return [emg_upper_trap, emg_scm, emg_levator, pitch, roll, duration]


def _sample_alert():
    """Generate one Alert-class feature vector (at least one alert trigger)."""
    trigger = np.random.choice(["emg", "pitch", "roll", "duration"])

    emg_upper_trap = np.random.uniform(0.0, 0.75)
    emg_scm        = np.random.uniform(0.0, 0.75)
    emg_levator    = np.random.uniform(0.0, 0.75)
    pitch          = np.random.uniform(-10, PITCH_ALERT_THRESHOLD - 1)
    roll           = np.random.uniform(-(ROLL_ALERT_THRESHOLD - 1),
                                         ROLL_ALERT_THRESHOLD - 1)
    duration       = np.random.randint(0, POOR_POSTURE_DURATION_ALERT)

    if trigger == "emg":
        lead = np.random.uniform(EMG_ALERT_THRESHOLD, 1.0)
        emg_upper_trap = lead
    elif trigger == "pitch":
        pitch = np.random.uniform(PITCH_ALERT_THRESHOLD, 60)
    elif trigger == "roll":
        roll = np.random.uniform(ROLL_ALERT_THRESHOLD, 40)
        if np.random.random() < 0.5:
            roll = -roll
    else:
        duration = np.random.randint(POOR_POSTURE_DURATION_ALERT, 3600)
    return [emg_upper_trap, emg_scm, emg_levator, pitch, roll, duration]


def generate_dataset(n_samples=N_SAMPLES):
    """
    Synthesise a balanced labelled dataset by directly sampling
    feature vectors for each class according to _CLASS_RATIOS.

    Returns
    -------
    X : np.ndarray  shape (n_samples, 6)
    y : np.ndarray  shape (n_samples,)
    """
    samplers = {
        LABEL_NORMAL:  _sample_normal,
        LABEL_WARNING: _sample_warning,
        LABEL_ALERT:   _sample_alert,
    }

    X, y = [], []
    for label, ratio in _CLASS_RATIOS.items():
        count = int(n_samples * ratio)
        for _ in range(count):
            X.append(samplers[label]())
            y.append(label)

    # Shuffle the combined dataset
    idx = np.arange(len(X))
    np.random.shuffle(idx)
    return np.array(X)[idx], np.array(y)[idx]


def train():
    """
    Full training pipeline: generate data → scale → train → evaluate → save.
    """
    print("=" * 60)
    print("  CervicalSentinel – Model Training")
    print("=" * 60)

    # 1. Generate dataset
    print(f"\n[1/5] Generating {N_SAMPLES} synthetic training samples …")
    X, y = generate_dataset()
    label_counts = {LABEL_NAMES[k]: int(np.sum(y == k)) for k in [0, 1, 2]}
    print("      Class distribution:", label_counts)

    # 2. Train / test split (80 % train, 20 % test)
    print("\n[2/5] Splitting into train (80 %) and test (20 %) sets …")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Feature scaling
    print("\n[3/5] Scaling features …")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # 4. Train Decision Tree
    print("\n[4/5] Training Decision Tree classifier …")
    model = DecisionTreeClassifier(
        max_depth=8,          # limit depth to avoid overfitting
        min_samples_leaf=10,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    # 5. Evaluate
    print("\n[5/5] Evaluation on the test set:")
    y_pred = model.predict(X_test_scaled)
    target_names = [LABEL_NAMES[k] for k in sorted(LABEL_NAMES)]
    print(classification_report(y_test, y_pred, target_names=target_names))
    print("Confusion matrix (rows = actual, cols = predicted):")
    print(confusion_matrix(y_test, y_pred))
    print()

    # Print a compact text view of the top of the tree
    tree_rules = export_text(model, feature_names=FEATURE_NAMES, max_depth=3)
    print("Decision Tree (first 3 levels):\n")
    print(tree_rules)

    # 6. Save model and scaler
    os.makedirs(os.path.dirname(config.MODEL_PATH) or ".", exist_ok=True)
    joblib.dump(model,  config.MODEL_PATH)
    joblib.dump(scaler, config.SCALER_PATH)
    print(f"[✓] Model  saved to: {config.MODEL_PATH}")
    print(f"[✓] Scaler saved to: {config.SCALER_PATH}")
    print("\nTraining complete. You can now start the Flask API.")
    return model, scaler


if __name__ == "__main__":
    train()
