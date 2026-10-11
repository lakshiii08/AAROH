import os
from pathlib import Path
import pymupdf

def create_sample_textbook_pdf(output_path: str = "data/raw/sample_class3_evs_water.pdf"):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open()

    # Page 1: Chapter Introduction & Sources of Water
    page1 = doc.new_page()
    text_page1 = """Chapter 3: Water - The Elixir of Our Village Life
Class 3 | Environmental Studies (EVS) | NCERT Aligned

1. Sources of Water in Our Village
Every morning in Ramu's village, elders and children visit the community handpump (chapakal) and the village well (kuan).
Water is life for people, crops, and domestic animals. 

Where does water come from?
- Rain (Baarish): The greatest gift from the monsoon clouds over our hills.
- Rivers & Streams (Nadi aur Jharna): Clear water flowing down from the forest hills.
- Groundwater: Drawn through deep village wells and handpumps.
- Village Pond (Talab): Where cattle bathe and rain water collects.

Activity 1: 
Ask your grandmother how the village pond was protected in the old days. Notice how villagers never wash dirty clothes near the drinking water well.
"""
    rect1 = pymupdf.Rect(50, 50, 550, 750)
    page1.insert_textbox(rect1, text_page1, fontsize=12, fontname="helv")

    # Page 2: Water Cycle, Traditional Storage, and Conservation
    page2 = doc.new_page()
    text_page2 = """2. The Journey of Water (Water Cycle)
When the afternoon sun shines hot upon the river, small droplets of water turn into invisible steam (evaporation).
The steam rises high into the cool mountain air, gathering into fluffy clouds.
When the clouds get heavy, rain pours down upon our forest trees, fields, and thatched roofs.

3. Traditional Water Storage & Conservation
In tribal communities of Bastar and Chota Nagpur, people treat water as sacred.
- Earthen Pot (Matka / Surahi): Keeps drinking water cool and pure naturally without electricity.
- Bamboo Spouts: Directing spring water into terraced fields.
- Check-Dams (Bandhara): Simple stone barriers built across seasonal streams to retain moisture in the soil.

Remember:
Do not waste a single drop. Always cover the water pitcher with a clean plate.
"""
    rect2 = pymupdf.Rect(50, 50, 550, 750)
    page2.insert_textbox(rect2, text_page2, fontsize=12, fontname="helv")

    doc.save(output_path)
    doc.close()
    print(f"Sample curriculum PDF generated at: {output_path}")

if __name__ == "__main__":
    create_sample_textbook_pdf()
