#!/bin/bash
set -a
source .env
set +a
python openproject_import.py
