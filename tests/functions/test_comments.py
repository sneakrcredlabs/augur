#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""augur-core unit tests

Unit tests for data and api/comments.se.

@author Jack Peterson (jack@tinybike.net)

"""
import sys
import os
import unittest
from ethereum import tester

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, os.path.join(HERE, os.pardir))

from contract import ContractTest

class TestComments(ContractTest):

    def setUp(self):
        ContractTest.setUp(self, "functions", "comments.se")
        self.event_fields = {"_event_type", "market", "ipfsHash"}
        self.params = {
            "market": 0xdeadbeef,
            "ipfsHash": 0x9476f29817610e62188f562d329d4f8e2327467f74c6c682dd914c3222d77285,
        }

    def test_addComment(self):
        with self.capture_stdout() as output:
            retval = self.contract.addComment(self.params["market"],
                                              self.params["ipfsHash"])
        assert(retval == 1)
        output = self.parse_log(output)
        assert(set(output.keys()) == self.event_fields)
        for k in self.params:
            assert(self.params[k] == output[k] % 2**256)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestComments)
    unittest.TextTestRunner(verbosity=2).run(suite)
