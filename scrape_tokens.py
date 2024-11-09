import json
import requests
import os
from bs4 import BeautifulSoup
from requests.exceptions import HTTPError

WIKI_URL = "https://wiki.bloodontheclocktower.com{}"

def is_offical(entry):
    name = entry["name"]
    character_url = "/" + name.replace(" ", "_")
    try:
        response = requests.get(WIKI_URL.format(character_url));
        response.raise_for_status()
        return True
    except HTTPError as e:
        if e.response.reason == "Not Found": return False
        raise e

def sync_description(entry):
    name = entry["name"]
    character_url = "/" + name.replace(" ", "_")

    response = requests.get(WIKI_URL.format(character_url));
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')
    summary_header = soup.find(id='Summary')

    summary_element = summary_header.parent.nextSibling.nextSibling
    summary = summary_element.text[1:-2]

    if summary == data[id]["description"]: return

    data[id]["description"] = summary
    print("UPDATE   " + (name + ": ").ljust(20) + summary)

def download_image(entry):
    icon_url = "https://wiki.bloodontheclocktower.com/File:Icon_{}.png"
    name = entry["name"]
    id = entry["id"]

    # Step 1: Get HTML for the image page
    response = requests.get(icon_url.format(id))
    response.raise_for_status()  # Raise an error for bad responses

    # Step 2: Parse HTML to find the element with id "file"
    soup = BeautifulSoup(response.content, 'html.parser')
    file_element = soup.find(id='file')

    if file_element is None:
        print(f"No element with id 'file' found for ID {id}.")
        return

    # Step 3: Get the first child which should be an <img> tag
    img_tag = file_element.find('img')
    if not img_tag or 'src' not in img_tag.attrs:
        print(f"No <img> found for ID {id}.")
        return
    
    # Step 4: Get the relative src url
    relative_url = img_tag['src']
    full_image_url = WIKI_URL.format(relative_url)

    # Step 5: Download and save the image
    img_response = requests.get(full_image_url)
    img_response.raise_for_status()

    # Step 6: Compare to existing image, and see if an edit is necessary.
    filePath = f"assets/icons/official/{id}.png"
    if os.path.exists(filePath): 
        with open(filePath, "rb") as f:
            if f.read() == img_response.content:
                return

    # Save the image
    with open(filePath, 'wb') as img_file:
        img_file.write(img_response.content)
    print("DOWNLOAD " + (name + ": ").ljust(20) + f"{id}.png")




with open("data/tokens.json") as f:
    data = json.loads(f.read())

official_keys = list()
homebrew_keys = list()

for id in data.keys():
    # if id == "cultleader": break
    entry = data[id]
    if not is_offical(entry): 
        homebrew_keys.append(id)
        continue
    official_keys.append(id)
    download_image(entry)
    sync_description(entry)

homebrew_keys.sort()
official_keys.sort()

new_data = dict()
for k in official_keys:
    new_data[k] = data[k]
for k in homebrew_keys:
    new_data[k] = data[k]

with open("data/tokens.json", "w") as f:
    f.write(json.dumps(new_data, indent=4))
