
RICE YIELD THAILAND
WEBSITE DATA HANDOFF PACKAGE
Version 1.0

============================================================
DATA COVERAGE
============================================================

Thailand:
77 provinces

Monthly Climate:
2011-2025

Monthly NDVI:
2011-2025

Rice Yield:
2011-2024

Final ML Predictions:
2023-2024

============================================================
IMPORTANT RULES
============================================================

1. Rice Yield is yearly/crop-year data.
   Do NOT display monthly rice yield.

2. Climate and NDVI are monthly.

3. province_id is the canonical join key.

4. actual_yield = observed/official yield.

5. predicted_yield = machine-learning estimate.

6. residual = actual_yield - predicted_yield.

   Negative = model overprediction.
   Positive = model underprediction.

7. SHAP describes model behavior and is not proof of causation.

8. Prediction intervals come from the conformal calibration
   experiment and should retain their method metadata.

============================================================
MODEL
============================================================

Extra Trees Regressor

Final Test 2023-2024:

MAE  = 54.08 kg/rai
RMSE = 68.93 kg/rai
R²   = 0.750

============================================================
