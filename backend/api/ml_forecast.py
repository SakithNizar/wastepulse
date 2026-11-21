from datetime import datetime, timedelta
import math
import random

BUSINESS_PROFILES = {
    'SUPERMARKET': {'code': 0, 'base_kg': 85.0, 'weekend_boost': 1.35, 'top_category': 'ORGANIC'},
    'RESTAURANT': {'code': 1, 'base_kg': 42.0, 'weekend_boost': 1.45, 'top_category': 'ORGANIC'},
    'WAREHOUSE': {'code': 2, 'base_kg': 120.0, 'weekend_boost': 0.85, 'top_category': 'CARDBOARD'},
    'MANUFACTURER': {'code': 3, 'base_kg': 160.0, 'weekend_boost': 0.90, 'top_category': 'PLASTIC'},
}

CO2_FACTORS = {
    'ORGANIC': 1.9,
    'PLASTIC': 2.5,
    'CARDBOARD': 1.1,
    'METAL': 4.0,
    'GLASS': 0.3,
    'EWASTE': 3.5,
}


class RidgeSurplusRegressor:
    """
    Lightweight L2-regularized linear regressor trained via batch gradient descent.
    Zero compiled C-extension dependencies (compatible with strict Windows App Control & Vercel).
    """

    def __init__(self, lr: float = 0.05, epochs: int = 600, l2_alpha: float = 0.01):
        self.lr = lr
        self.epochs = epochs
        self.l2_alpha = l2_alpha
        self.weights = []
        self.bias = 0.0

    def fit(self, X: list[list[float]], y: list[float]):
        n_samples = len(X)
        n_features = len(X[0])
        self.weights = [0.0] * n_features
        self.bias = 0.0

        for _ in range(self.epochs):
            dw = [0.0] * n_features
            db = 0.0

            for i in range(n_samples):
                pred = self.bias + sum(self.weights[j] * X[i][j] for j in range(n_features))
                err = pred - y[i]
                db += err
                for j in range(n_features):
                    dw[j] += err * X[i][j]

            for j in range(n_features):
                reg_term = self.l2_alpha * self.weights[j]
                self.weights[j] -= self.lr * ((dw[j] / n_samples) + reg_term)
            self.bias -= self.lr * (db / n_samples)

    def predict_one(self, x: list[float]) -> float:
        return self.bias + sum(self.weights[j] * x[j] for j in range(len(x)))


def _encode_features(b_code: int, dow: int, is_weekend: int, day_of_month: int) -> list[float]:
    # One-hot encode business type (4) + cyclic day-of-week sin/cos + weekend flag + month phase
    one_hot = [1.0 if idx == b_code else 0.0 for idx in range(4)]
    dow_sin = math.sin(2 * math.pi * dow / 7.0)
    dow_cos = math.cos(2 * math.pi * dow / 7.0)
    month_norm = day_of_month / 30.0
    return one_hot + [float(is_weekend), dow_sin, dow_cos, month_norm]


def train_and_predict_surplus(business_type: str = 'SUPERMARKET', days: int = 7, live_batch_count: int = 0):
    """
    Trains a Ridge Regression model on 12 weeks of commercial surplus curves
    and predicts the next N days of surplus waste & CO2 diversion.
    """
    b_type = business_type.upper() if business_type.upper() in BUSINESS_PROFILES else 'SUPERMARKET'
    profile = BUSINESS_PROFILES[b_type]

    rng = random.Random(42)
    X_train = []
    y_train = []

    for _, prof in BUSINESS_PROFILES.items():
        for day_idx in range(84):
            dow = day_idx % 7
            is_weekend = 1 if dow >= 5 else 0
            week_trend = 1.0 + (day_idx / 84.0) * 0.08
            noise = rng.gauss(0.0, prof['base_kg'] * 0.06)

            multiplier = prof['weekend_boost'] if is_weekend else 1.0
            target_kg = max(5.0, (prof['base_kg'] * multiplier * week_trend) + noise)

            X_train.append(_encode_features(prof['code'], dow, is_weekend, day_idx % 30))
            y_train.append(target_kg)

    model = RidgeSurplusRegressor(lr=0.08, epochs=800, l2_alpha=0.005)
    model.fit(X_train, y_train)

    activity_scale = 1.0 + min(live_batch_count * 0.01, 0.25)

    today = datetime.now().date()
    predictions = []
    top_cat = profile['top_category']
    co2_factor = CO2_FACTORS.get(top_cat, 1.5)

    for offset in range(1, days + 1):
        target_date = today + timedelta(days=offset)
        dow = target_date.weekday()
        is_weekend = 1 if dow >= 5 else 0
        feats = _encode_features(profile['code'], dow, is_weekend, target_date.day % 30)

        pred_kg = round(max(5.0, model.predict_one(feats)) * activity_scale, 1)
        pred_co2 = round(pred_kg * co2_factor, 1)

        predictions.append({
            'date': target_date.isoformat(),
            'day_name': target_date.strftime('%a'),
            'predicted_weight_kg': pred_kg,
            'predicted_co2_saved_kg': pred_co2,
            'primary_category': top_cat,
        })

    peak_day = max(predictions, key=lambda x: x['predicted_weight_kg'])
    total_predicted_kg = round(sum(p['predicted_weight_kg'] for p in predictions), 1)

    return {
        'business_type': b_type,
        'forecast_days': days,
        'model_algorithm': 'RidgeSurplusRegressor (L2 Gradient Descent)',
        'total_predicted_kg': total_predicted_kg,
        'peak_surplus_day': peak_day,
        'daily_forecast': predictions,
    }
