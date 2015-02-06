Setlocal EnableDelayedExpansion
%windir%\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe GMEModelStatistics.sln /m /nodeReuse:false || exit /b !ERRORLEVEL!
