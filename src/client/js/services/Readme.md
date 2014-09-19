# Services #

## Scenarios ##

1. Project created on server
2. Project deleted on server
3. Branch created on server for project X
4. Branch deleted on server for project X
5. Project selected on client (projectId = project X)
6. Project closed on client (projectId = null)
7. No active project is selected on client (projectId = null)
8. Branch selected on client (active branch = branch Y)
9. Branch selection is changed on client to null (active branch = null)
10. Active branch on client is deleted (active branch = null)
11. Read-only commit is loaded
12. Notification about read-only status change
13. Create new branch from current commit and switch to it
14. Remote connection is lost (enter read-only mode?, try to auto-reconnect)

## Services and event notification mechanism ##

TODO...
