"""Validate the classifier contract without loading TensorFlow."""

from __future__ import annotations

import unittest

import numpy as np

import inference


class FakeClassifier:
    output_shape = (None, 6)

    def __init__(self, output: np.ndarray):
        self.output = output

    def predict(self, _batch, verbose=0):
        del verbose
        return self.output


class ClassifierContractTests(unittest.TestCase):
    def test_accepts_one_probability_vector_for_six_classes(self):
        model = FakeClassifier(
            np.asarray([[0.1, 0.2, 0.1, 0.2, 0.1, 0.3]], dtype=np.float32)
        )
        inference._validate_classifier_contract(model)

    def test_rejects_wrong_runtime_shape(self):
        model = FakeClassifier(np.zeros((1, 2, 3), dtype=np.float32))
        with self.assertRaises(RuntimeError):
            inference._validate_classifier_contract(model)

    def test_rejects_non_finite_or_non_probability_outputs(self):
        for output in (
            np.asarray([[np.nan, 0, 0, 0, 0, 0]], dtype=np.float32),
            np.asarray([[2, 0, 0, 0, 0, 0]], dtype=np.float32),
        ):
            with self.subTest(output=output):
                with self.assertRaises(RuntimeError):
                    inference._validate_classifier_contract(FakeClassifier(output))


if __name__ == "__main__":
    unittest.main()
