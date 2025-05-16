#!/usr/bin/env python

from setuptools import setup, find_packages

setup(
    name="secrets_agent",
    version="2.2.1",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "pyyaml",
        "watchdog",
        "cryptography",
        "flask",
        "requests",
        "python-dotenv",
    ],
    entry_points={
        "console_scripts": [
            "vanta=cli:main",
        ],
    },
) 