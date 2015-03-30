'''
windowsservice.py: runs node_worker.js as a Windows service

HOWTO:
Install http://sourceforge.net/projects/pywin32/
.\windowsservice.py addservicelogon kevin
.\windowsservice.py --username .\kevin --password secret install
.\windowsservice.py start
.\windowsservice.py stop
.\windowsservice.py remove
Workers are listed at http://localhost:8855/rest/external/executor/worker
These log files are written in this directory: npm.log  service_stderr.log  service_stdout.log
Service startup errors are written to Event Viewer> Application log
'''

import os
import sys
import win32serviceutil
import win32service
import servicemanager
import win32event

import os.path
import subprocess
import win32api
import win32job
import win32file
import win32process
import win32service
import win32security

class WebGMEWorkerService(win32serviceutil.ServiceFramework):
    _svc_name_ = "WebGMEWorker"
    _svc_display_name_ = "WebGMEWorkerService"
    #_svc_description_ = ''
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.hJob = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        if hasattr(sys, "frozen"):
            this_dir = os.path.dirname(win32api.GetModuleFileName(None))
        else:
            this_dir = os.path.dirname(os.path.abspath(__file__))
        # TODO: maybe it is better to run this in a job object too
        with open(os.path.join(this_dir, 'npm.log'), 'w') as npm_log:
            subprocess.check_call('npm install', cwd=this_dir, shell=True, stdin=None, stdout=npm_log, stderr=subprocess.STDOUT)

        security_attributes = win32security.SECURITY_ATTRIBUTES()
        security_attributes.bInheritHandle = True
        startup = win32process.STARTUPINFO()
        startup.dwFlags |= win32process.STARTF_USESTDHANDLES
        startup.hStdInput = None
        startup.hStdOutput = win32file.CreateFile(os.path.join(this_dir, "service_stderr.log"), win32file.GENERIC_WRITE, win32file.FILE_SHARE_READ, security_attributes, win32file.CREATE_ALWAYS, 0, None)
        startup.hStdError = win32file.CreateFile(os.path.join(this_dir, "service_stdout.log"), win32file.GENERIC_WRITE, win32file.FILE_SHARE_READ, security_attributes, win32file.CREATE_ALWAYS, 0, None)
        (hProcess, hThread, processId, threadId) = win32process.CreateProcess(None, r'"C:\Program Files\nodejs\node.exe" node_worker.js', None, None, True,
            win32process.CREATE_SUSPENDED | win32process.CREATE_BREAKAWAY_FROM_JOB, None, this_dir, startup)

        assert not win32job.IsProcessInJob(hProcess, None)

        self.hJob = win32job.CreateJobObject(None, "")
        extended_info = win32job.QueryInformationJobObject(self.hJob, win32job.JobObjectExtendedLimitInformation)
        extended_info['BasicLimitInformation']['LimitFlags'] = win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | win32job.JOB_OBJECT_LIMIT_BREAKAWAY_OK
        win32job.SetInformationJobObject(self.hJob, win32job.JobObjectExtendedLimitInformation, extended_info)
        win32job.AssignProcessToJobObject(self.hJob, hProcess)

        win32process.ResumeThread(hThread)
        win32api.CloseHandle(hThread)
        
        signalled = win32event.WaitForMultipleObjects([self.hWaitStop, hProcess], False, win32event.INFINITE)
        if signalled == win32event.WAIT_OBJECT_0 + 1 and win32process.GetExitCodeProcess(hProcess) != 0:
            servicemanager.LogErrorMsg(self._svc_name_ + " process exited with non-zero status " + str(win32process.GetExitCodeProcess(hProcess)))
        win32api.CloseHandle(hProcess)
        win32api.CloseHandle(self.hJob)
        win32api.CloseHandle(self.hWaitStop)
        win32api.CloseHandle(startup.hStdOutput)
        win32api.CloseHandle(startup.hStdError)

if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'addservicelogon':
        user = sys.argv[2]
        import subprocess
        import io
        import codecs
        try:
            os.unlink('secpol.inf')
        except OSError as e:
            if e.errno != 2:
                raise
        subprocess.check_call('secedit /export /cfg secpol.inf')
        with io.open('secpol.inf', 'r', encoding='utf-16-le') as secpol_inf:
            line = [l for l in secpol_inf.readlines() if l.startswith('SeServiceLogonRight = ')][0]
        with open('secpol.inf', 'wb') as secpol_inf:
            secpol_inf.write(codecs.BOM_UTF16_LE)
            secpol_inf.write((u'''[Unicode]
Unicode=yes
[Privilege Rights]
%s
[Version]
signature="$CHICAGO$"
Revision=1
''' % (line.replace('\n', '').replace('\r', '') + ',' + user)).encode('utf-16-le'))
        subprocess.check_call('secedit /configure /db database.sdb /cfg secpol.inf')
    else:
        win32serviceutil.HandleCommandLine(WebGMEWorkerService)
