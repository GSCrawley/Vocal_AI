import sys
from unittest.mock import MagicMock

sys.modules['crepe'] = MagicMock()

import pytest
sys.exit(pytest.main(["tests/"]))
