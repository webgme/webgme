#import requests
#s = requests.Session()

#username = input("Please enter your login name for webGME server:")
#password = input("Please enter to password associated with the username:")

#response = s.post("http://kecskes.isis.vanderbilt.edu/login/client",dict(username=username,password=password))
#if response.status_code != requests.codes.ok:
#    print ("Invalid user credentials! Program stops.")
#    quit()

#response = s.get("http://kecskes.isis.vanderbilt.edu/gettoken")
#print (response.status_code)
#token = response.content.decode("utf-8")
#print (token)
#response = s.get("http://kecskes.isis.vanderbilt.edu/rest/"+token+"/projects")
#projects = response.json()
#print(projects)

from webclient import webclient

w = webclient()

w.setToken("078dd342-6695-af73-b4cc-90aeb4820feetoken")

db = w.connect()

p = db.getProject('kecso')

if p != None:
    print ("yuheee")

print(p.getBranches())

r = p.getRoot('master')

if r != None:
    print("yuheeee")

print(r.attributes)

children = r.children
for child in children:
    print(child.attributes)