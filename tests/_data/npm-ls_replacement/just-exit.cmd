@echo off

REM ------------------------------------------------------------
REM This file is part of CycloneDX generator for NPM projects.
REM
REM Licensed under the Apache License, Version 2.0 (the "License");
REM you may not use this file except in compliance with the License.
REM You may obtain a copy of the License at
REM
REM    http://www.apache.org/licenses/LICENSE-2.0
REM
REM Unless required by applicable law or agreed to in writing, software
REM distributed under the License is distributed on an "AS IS" BASIS,
REM WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
REM See the License for the specific language governing permissions and
REM limitations under the License.
REM
REM Copyright (c) OWASP Foundation. All Rights Reserved.
REM SPDX-License-Identifier: Apache-2.0
REM ------------------------------------------------------------

if "%~1"=="--version" (
    REM echo %CT_VERSION%
    echo 11.0.0
    exit /b 0
)

set "EXIT_CODE=%CT_EXIT_CODE%"
if "%EXIT_CODE%"=="" set "EXIT_CODE=0"

exit /b %EXIT_CODE%
