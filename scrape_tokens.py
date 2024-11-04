import json
import requests
from bs4 import BeautifulSoup
import os

with open("data/tokens.json") as f:
    data = json.loads(f.read())

wiki_url = "https://wiki.bloodontheclocktower.com/File:Icon_{}.png"
images_url = "https://wiki.bloodontheclocktower.com{}"



def download_image(id):
    try:
        # Step 1: Get HTML for the image page
        response = requests.get(wiki_url.format(id))
        response.raise_for_status()  # Raise an error for bad responses

        # Step 2: Parse HTML to find the element with id "file"
        soup = BeautifulSoup(response.content, 'html.parser')
        file_element = soup.find(id='file')

        if file_element is not None:
            # Step 3: Get the first child which should be an <img> tag
            img_tag = file_element.find('img')
            if img_tag and 'src' in img_tag.attrs:
                # Step 4: Get the relative src url
                relative_url = img_tag['src']
                full_image_url = images_url.format(relative_url)

                # Step 5: Download and save the image
                img_response = requests.get(full_image_url)
                img_response.raise_for_status()

                # Save the image
                with open(f"assets/icons/official/{id}.png", 'wb') as img_file:
                    img_file.write(img_response.content)
                print(f"Downloaded image for ID {id} as {id}.png")
            else:
                print(f"No <img> found for ID {id}.")
        else:
            print(f"No element with id 'file' found for ID {id}.")
    except Exception as e:
        print(f"Error processing ID {id}: {e}")

# Loop through the IDs and process each one
#for id in data:
#    download_image(id)
for id in data.keys():
    download_image(id)