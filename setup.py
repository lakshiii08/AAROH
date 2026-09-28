from setuptools import setup, find_packages

setup(
    name="aaroh",
    version="0.1.0",
    description="AAROH - AI-Powered Educational Platform for Rural & Tribal Primary Education",
    author="AAROH Team",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.10",
)
