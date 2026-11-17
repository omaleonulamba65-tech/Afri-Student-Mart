export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  // West Africa & South Africa
  'Ghana',
  'Senegal',
  'Ivory Coast',
  'Mali',
  'Burkina Faso',
  'Niger Republic',
  'Togo',
  'Benin Republic',
  'Sierra Leone',
  'Liberia',
  'Guinea',
  'Gambia',
  'Cape Verde',
  'Guinea-Bissau',
  'South Africa',
] as const;

export interface InstitutionOption {
  name: string;
  shortName: string;
  type:
    | 'Federal University'
    | 'State University'
    | 'Private University'
    | 'Polytechnic'
    | 'College of Education'
    | 'Monotechnic'
    | 'University'
    | 'Technical University';
  state: string;
  country?: string;
}

export const NIGERIAN_INSTITUTIONS: InstitutionOption[] = [
  // Federal Universities
  { name: 'University of Lagos (UNILAG)', shortName: 'UNILAG', type: 'Federal University', state: 'Lagos' },
  { name: 'University of Ibadan (UI)', shortName: 'UI', type: 'Federal University', state: 'Oyo' },
  { name: 'Obafemi Awolowo University (OAU)', shortName: 'OAU', type: 'Federal University', state: 'Osun' },
  { name: 'University of Nigeria, Nsukka (UNN)', shortName: 'UNN', type: 'Federal University', state: 'Enugu' },
  { name: 'Ahmadu Bello University, Zaria (ABU)', shortName: 'ABU', type: 'Federal University', state: 'Kaduna' },
  { name: 'University of Benin (UNIBEN)', shortName: 'UNIBEN', type: 'Federal University', state: 'Edo' },
  { name: 'University of Ilorin (UNILORIN)', shortName: 'UNILORIN', type: 'Federal University', state: 'Kwara' },
  { name: 'Federal University of Technology, Akure (FUTA)', shortName: 'FUTA', type: 'Federal University', state: 'Ondo' },
  { name: 'Federal University of Technology, Minna (FUTMINNA)', shortName: 'FUTMINNA', type: 'Federal University', state: 'Niger' },
  { name: 'Federal University of Technology, Owerri (FUTO)', shortName: 'FUTO', type: 'Federal University', state: 'Imo' },
  { name: 'University of Port Harcourt (UNIPORT)', shortName: 'UNIPORT', type: 'Federal University', state: 'Rivers' },
  { name: 'University of Abuja (UNIABUJA)', shortName: 'UNIABUJA', type: 'Federal University', state: 'FCT Abuja' },
  { name: 'University of Calabar (UNICAL)', shortName: 'UNICAL', type: 'Federal University', state: 'Cross River' },
  { name: 'University of Jos (UNIJOS)', shortName: 'UNIJOS', type: 'Federal University', state: 'Plateau' },
  { name: 'University of Maiduguri (UNIMAID)', shortName: 'UNIMAID', type: 'Federal University', state: 'Borno' },
  { name: 'University of Uyo (UNIUYO)', shortName: 'UNIUYO', type: 'Federal University', state: 'Akwa Ibom' },
  { name: 'Bayero University, Kano (BUK)', shortName: 'BUK', type: 'Federal University', state: 'Kano' },
  { name: 'Nnamdi Azikiwe University, Awka (UNIZIK)', shortName: 'UNIZIK', type: 'Federal University', state: 'Anambra' },
  { name: 'Federal University of Agriculture, Abeokuta (FUNAAB)', shortName: 'FUNAAB', type: 'Federal University', state: 'Ogun' },
  { name: 'Michael Okpara University of Agriculture, Umudike (MOUAU)', shortName: 'MOUAU', type: 'Federal University', state: 'Abia' },
  { name: 'Joseph Sarwuan Tarka University, Makurdi (JOSTUM)', shortName: 'JOSTUM', type: 'Federal University', state: 'Benue' },
  { name: 'Abubakar Tafawa Balewa University, Bauchi (ATBU)', shortName: 'ATBU', type: 'Federal University', state: 'Bauchi' },
  { name: 'Usmanu Danfodiyo University, Sokoto (UDUSOK)', shortName: 'UDUSOK', type: 'Federal University', state: 'Sokoto' },
  { name: 'Modibbo Adama University, Yola (MAU)', shortName: 'MAU', type: 'Federal University', state: 'Adamawa' },
  { name: 'Federal University Oye-Ekiti (FUOYE)', shortName: 'FUOYE', type: 'Federal University', state: 'Ekiti' },
  { name: 'Federal University Lokoja (FULOKOJA)', shortName: 'FULOKOJA', type: 'Federal University', state: 'Kogi' },
  { name: 'Federal University Lafia (FULAFIA)', shortName: 'FULAFIA', type: 'Federal University', state: 'Nasarawa' },
  { name: 'Federal University Dutse (FUD)', shortName: 'FUD', type: 'Federal University', state: 'Jigawa' },
  { name: 'Federal University Dutsin-Ma (FUDMA)', shortName: 'FUDMA', type: 'Federal University', state: 'Katsina' },
  { name: 'Federal University Kashere (FUKASHERE)', shortName: 'FUKASHERE', type: 'Federal University', state: 'Gombe' },
  { name: 'Federal University Wukari (FUWUKARI)', shortName: 'FUWUKARI', type: 'Federal University', state: 'Taraba' },
  { name: 'Federal University Birnin Kebbi (FUBK)', shortName: 'FUBK', type: 'Federal University', state: 'Kebbi' },
  { name: 'Federal University Gusau (FUGUS)', shortName: 'FUGUS', type: 'Federal University', state: 'Zamfara' },
  { name: 'Federal University Gashua (FUGASHUA)', shortName: 'FUGASHUA', type: 'Federal University', state: 'Yobe' },
  { name: 'Federal University Otuoke (FUOTUOKE)', shortName: 'FUOTUOKE', type: 'Federal University', state: 'Bayelsa' },
  { name: 'Alex Ekwueme Federal University, Ndufu-Alike (AE-FUNAI)', shortName: 'AE-FUNAI', type: 'Federal University', state: 'Ebonyi' },
  { name: 'Federal University of Petroleum Resources, Effurun (FUPRE)', shortName: 'FUPRE', type: 'Federal University', state: 'Delta' },
  { name: 'National Open University of Nigeria (NOUN)', shortName: 'NOUN', type: 'Federal University', state: 'FCT Abuja' },
  { name: 'Nigerian Defence Academy (NDA)', shortName: 'NDA', type: 'Federal University', state: 'Kaduna' },
  { name: 'Air Force Institute of Technology (AFIT)', shortName: 'AFIT', type: 'Federal University', state: 'Kaduna' },

  // State Universities
  { name: 'Lagos State University (LASU)', shortName: 'LASU', type: 'State University', state: 'Lagos' },
  { name: 'Lagos State University of Science and Technology (LASUSTECH)', shortName: 'LASUSTECH', type: 'State University', state: 'Lagos' },
  { name: 'Lagos State University of Education (LASUED)', shortName: 'LASUED', type: 'State University', state: 'Lagos' },
  { name: 'Olabisi Onabanjo University (OOU)', shortName: 'OOU', type: 'State University', state: 'Ogun' },
  { name: 'Tai Solarin University of Education (TASUED)', shortName: 'TASUED', type: 'State University', state: 'Ogun' },
  { name: 'Ladoke Akintola University of Technology (LAUTECH)', shortName: 'LAUTECH', type: 'State University', state: 'Oyo' },
  { name: 'Abiola Ajimobi Technical University (TECH-U)', shortName: 'TECH-U', type: 'State University', state: 'Oyo' },
  { name: 'Osun State University (UNIOSUN)', shortName: 'UNIOSUN', type: 'State University', state: 'Osun' },
  { name: 'Ekiti State University (EKSU)', shortName: 'EKSU', type: 'State University', state: 'Ekiti' },
  { name: 'Adekunle Ajasin University, Akungba-Akoko (AAUA)', shortName: 'AAUA', type: 'State University', state: 'Ondo' },
  { name: 'Olusegun Agagu University of Science & Technology (OAUSTECH)', shortName: 'OAUSTECH', type: 'State University', state: 'Ondo' },
  { name: 'University of Medical Sciences, Ondo (UNIMED)', shortName: 'UNIMED', type: 'State University', state: 'Ondo' },
  { name: 'Kwara State University (KWASU)', shortName: 'KWASU', type: 'State University', state: 'Kwara' },
  { name: 'Ambrose Alli University, Ekpoma (AAU)', shortName: 'AAU', type: 'State University', state: 'Edo' },
  { name: 'Delta State University, Abraka (DELSU)', shortName: 'DELSU', type: 'State University', state: 'Delta' },
  { name: 'Rivers State University (RSU)', shortName: 'RSU', type: 'State University', state: 'Rivers' },
  { name: 'Ignatius Ajuru University of Education (IAUE)', shortName: 'IAUE', type: 'State University', state: 'Rivers' },
  { name: 'Akwa Ibom State University (AKSU)', shortName: 'AKSU', type: 'State University', state: 'Akwa Ibom' },
  { name: 'University of Cross River State (UNICROSS)', shortName: 'UNICROSS', type: 'State University', state: 'Cross River' },
  { name: 'Niger Delta University (NDU)', shortName: 'NDU', type: 'State University', state: 'Bayelsa' },
  { name: 'Abia State University, Uturu (ABSU)', shortName: 'ABSU', type: 'State University', state: 'Abia' },
  { name: 'Chukwuemeka Odumegwu Ojukwu University (COOU)', shortName: 'COOU', type: 'State University', state: 'Anambra' },
  { name: 'Ebonyi State University (EBSU)', shortName: 'EBSU', type: 'State University', state: 'Ebonyi' },
  { name: 'Enugu State University of Science & Technology (ESUT)', shortName: 'ESUT', type: 'State University', state: 'Enugu' },
  { name: 'Imo State University (IMSU)', shortName: 'IMSU', type: 'State University', state: 'Imo' },
  { name: 'Benue State University, Makurdi (BSU)', shortName: 'BSU', type: 'State University', state: 'Benue' },
  { name: 'Prince Abubakar Audu University, Anyigba (PAAU / KSU)', shortName: 'PAAU', type: 'State University', state: 'Kogi' },
  { name: 'Nasarawa State University, Keffi (NSUK)', shortName: 'NSUK', type: 'State University', state: 'Nasarawa' },
  { name: 'Plateau State University, Bokkos (PLASU)', shortName: 'PLASU', type: 'State University', state: 'Plateau' },
  { name: 'Kaduna State University (KASU)', shortName: 'KASU', type: 'State University', state: 'Kaduna' },
  { name: 'Aliko Dangote University of Science & Technology, Wudil (ADUSTECH)', shortName: 'ADUSTECH', type: 'State University', state: 'Kano' },
  { name: 'Yusuf Maitama Sule University, Kano (YUMSUK)', shortName: 'YUMSUK', type: 'State University', state: 'Kano' },
  { name: 'Umaru Musa Yar\'adua University, Katsina (UMYU)', shortName: 'UMYU', type: 'State University', state: 'Katsina' },
  { name: 'Ibrahim Badamasi Babangida University, Lapai (IBBU)', shortName: 'IBBU', type: 'State University', state: 'Niger' },
  { name: 'Bauchi State University, Gadau (BASUG)', shortName: 'BASUG', type: 'State University', state: 'Bauchi' },
  { name: 'Gombe State University (GSU)', shortName: 'GSU', type: 'State University', state: 'Gombe' },
  { name: 'Adamawa State University, Mubi (ADSU)', shortName: 'ADSU', type: 'State University', state: 'Adamawa' },
  { name: 'Taraba State University, Jalingo (TSU)', shortName: 'TSU', type: 'State University', state: 'Taraba' },
  { name: 'Yobe State University, Damaturu (YSU)', shortName: 'YSU', type: 'State University', state: 'Yobe' },
  { name: 'Sokoto State University (SSU)', shortName: 'SSU', type: 'State University', state: 'Sokoto' },
  { name: 'Sule Lamido University, Kafin Hausa (SLU)', shortName: 'SLU', type: 'State University', state: 'Jigawa' },
  { name: 'Kebbi State University of Science & Technology, Aliero (KSUSTA)', shortName: 'KSUSTA', type: 'State University', state: 'Kebbi' },
  { name: 'Zamfara State University, Talata Mafara (ZAMSUT)', shortName: 'ZAMSUT', type: 'State University', state: 'Zamfara' },
  { name: 'Borno State University (BOSU)', shortName: 'BOSU', type: 'State University', state: 'Borno' },

  // Private Universities
  { name: 'Covenant University, Ota', shortName: 'Covenant', type: 'Private University', state: 'Ogun' },
  { name: 'Babcock University, Ilishan-Remo', shortName: 'Babcock', type: 'Private University', state: 'Ogun' },
  { name: 'Redeemer\'s University, Ede', shortName: 'RUN', type: 'Private University', state: 'Osun' },
  { name: 'Afe Babalola University, Ado-Ekiti (ABUAD)', shortName: 'ABUAD', type: 'Private University', state: 'Ekiti' },
  { name: 'Pan-Atlantic University, Lagos (PAU)', shortName: 'PAU', type: 'Private University', state: 'Lagos' },
  { name: 'Bowen University, Iwo', shortName: 'Bowen', type: 'Private University', state: 'Osun' },
  { name: 'Lead City University, Ibadan', shortName: 'Lead City', type: 'Private University', state: 'Oyo' },
  { name: 'Landmark University, Omu-Aran', shortName: 'Landmark', type: 'Private University', state: 'Kwara' },
  { name: 'Igbinedion University, Okada', shortName: 'IUO', type: 'Private University', state: 'Edo' },
  { name: 'Benson Idahosa University, Benin', shortName: 'BIU', type: 'Private University', state: 'Edo' },
  { name: 'Madonna University, Elele / Okija', shortName: 'Madonna', type: 'Private University', state: 'Rivers' },
  { name: 'Nile University of Nigeria, Abuja', shortName: 'Nile', type: 'Private University', state: 'FCT Abuja' },
  { name: 'Baze University, Abuja', shortName: 'Baze', type: 'Private University', state: 'FCT Abuja' },
  { name: 'Veritas University, Abuja', shortName: 'Veritas', type: 'Private University', state: 'FCT Abuja' },
  { name: 'American University of Nigeria, Yola (AUN)', shortName: 'AUN', type: 'Private University', state: 'Adamawa' },
  { name: 'Caleb University, Imota Lagos', shortName: 'Caleb', type: 'Private University', state: 'Lagos' },
  { name: 'Bells University of Technology, Ota', shortName: 'BellsTech', type: 'Private University', state: 'Ogun' },
  { name: 'Crawford University, Igbesa', shortName: 'Crawford', type: 'Private University', state: 'Ogun' },
  { name: 'Mountain Top University (MTU)', shortName: 'MTU', type: 'Private University', state: 'Ogun' },
  { name: 'Ajayi Crowther University, Oyo', shortName: 'ACU', type: 'Private University', state: 'Oyo' },
  { name: 'Al-Hikmah University, Ilorin', shortName: 'Al-Hikmah', type: 'Private University', state: 'Kwara' },
  { name: 'Bingham University, Karu', shortName: 'Bingham', type: 'Private University', state: 'Nasarawa' },
  { name: 'Godfrey Okoye University, Enugu', shortName: 'GOUNI', type: 'Private University', state: 'Enugu' },
  { name: 'Gregory University, Uturu', shortName: 'GUU', type: 'Private University', state: 'Abia' },

  // Polytechnics
  { name: 'Yaba College of Technology (YABATECH)', shortName: 'YABATECH', type: 'Polytechnic', state: 'Lagos' },
  { name: 'Lagos State Polytechnic / Ikorodu (LASPOTECH)', shortName: 'LASPOTECH', type: 'Polytechnic', state: 'Lagos' },
  { name: 'Auchi Polytechnic, Auchi', shortName: 'Auchi Poly', type: 'Polytechnic', state: 'Edo' },
  { name: 'The Polytechnic, Ibadan (POLYIBADAN)', shortName: 'Poly Ibadan', type: 'Polytechnic', state: 'Oyo' },
  { name: 'Federal Polytechnic, Nekede', shortName: 'FedPoly Nekede', type: 'Polytechnic', state: 'Imo' },
  { name: 'Federal Polytechnic, Ilaro', shortName: 'FedPoly Ilaro', type: 'Polytechnic', state: 'Ogun' },
  { name: 'Moshood Abiola Polytechnic, Abeokuta (MAPOLY)', shortName: 'MAPOLY', type: 'Polytechnic', state: 'Ogun' },
  { name: 'Federal Polytechnic, Ado-Ekiti', shortName: 'FedPoly Ado', type: 'Polytechnic', state: 'Ekiti' },
  { name: 'Federal Polytechnic, Offa', shortName: 'FedPoly Offa', type: 'Polytechnic', state: 'Kwara' },
  { name: 'Federal Polytechnic, Ede', shortName: 'FedPoly Ede', type: 'Polytechnic', state: 'Osun' },
  { name: 'Osun State Polytechnic, Iree (OSPOLY)', shortName: 'OSPOLY', type: 'Polytechnic', state: 'Osun' },
  { name: 'Rufus Giwa Polytechnic, Owo (RUGIPO)', shortName: 'RUGIPO', type: 'Polytechnic', state: 'Ondo' },
  { name: 'Kaduna Polytechnic (KADPOLY)', shortName: 'KADPOLY', type: 'Polytechnic', state: 'Kaduna' },
  { name: 'Federal Polytechnic, Bida', shortName: 'FedPoly Bida', type: 'Polytechnic', state: 'Niger' },
  { name: 'Federal Polytechnic, Bauchi', shortName: 'FedPoly Bauchi', type: 'Polytechnic', state: 'Bauchi' },
  { name: 'Federal Polytechnic, Nasarawa', shortName: 'FedPoly Nasarawa', type: 'Polytechnic', state: 'Nasarawa' },
  { name: 'Federal Polytechnic, Oko', shortName: 'FedPoly Oko', type: 'Polytechnic', state: 'Anambra' },
  { name: 'Institute of Management and Technology, Enugu (IMT)', shortName: 'IMT Enugu', type: 'Polytechnic', state: 'Enugu' },
  { name: 'Akanu Ibiam Federal Polytechnic, Unwana', shortName: 'Unwana Poly', type: 'Polytechnic', state: 'Ebonyi' },
  { name: 'Ken Saro-Wiwa Polytechnic, Bori', shortName: 'KenPoly', type: 'Polytechnic', state: 'Rivers' },
  { name: 'Delta State Polytechnic, Ogwashi-Uku', shortName: 'Ogwashi Poly', type: 'Polytechnic', state: 'Delta' },
  { name: 'Delta State Polytechnic, Ozoro / Otefe-Oghara', shortName: 'Otefe Poly', type: 'Polytechnic', state: 'Delta' },
  { name: 'Akwa Ibom State Polytechnic, Ikot Osurua', shortName: 'AkwaPoly', type: 'Polytechnic', state: 'Akwa Ibom' },
  { name: 'Kano State Polytechnic', shortName: 'KanoPoly', type: 'Polytechnic', state: 'Kano' },
  { name: 'Kogi State Polytechnic, Lokoja', shortName: 'KogiPoly', type: 'Polytechnic', state: 'Kogi' },
  { name: 'Benue State Polytechnic, Ugbokolo', shortName: 'BenPoly', type: 'Polytechnic', state: 'Benue' },
  { name: 'Ramat Polytechnic, Maiduguri', shortName: 'RamatPoly', type: 'Polytechnic', state: 'Borno' },
  { name: 'Federal Polytechnic, Idah', shortName: 'FedPoly Idah', type: 'Polytechnic', state: 'Kogi' },
  { name: 'Federal Polytechnic, Mubi', shortName: 'FedPoly Mubi', type: 'Polytechnic', state: 'Adamawa' },
  { name: 'Federal Polytechnic, Kaura Namoda', shortName: 'FedPoly Kaura', type: 'Polytechnic', state: 'Zamfara' },
  { name: 'Kwara State Polytechnic, Ilorin', shortName: 'KwaraPoly', type: 'Polytechnic', state: 'Kwara' },

  // Colleges of Education
  { name: 'Federal College of Education (Technical), Akoka', shortName: 'FCE Akoka', type: 'College of Education', state: 'Lagos' },
  { name: 'Federal College of Education, Zaria', shortName: 'FCE Zaria', type: 'College of Education', state: 'Kaduna' },
  { name: 'Federal College of Education, Abeokuta', shortName: 'FCE Abeokuta', type: 'College of Education', state: 'Ogun' },
  { name: 'Adeyemi Federal University of Education, Ondo (ACE)', shortName: 'Adeyemi Ondo', type: 'College of Education', state: 'Ondo' },
  { name: 'Alvan Ikoku Federal University of Education, Owerri', shortName: 'Alvan Ikoku', type: 'College of Education', state: 'Imo' },
  { name: 'Federal College of Education, Kano', shortName: 'FCE Kano', type: 'College of Education', state: 'Kano' },
  { name: 'Federal College of Education (Special), Oyo', shortName: 'FCE Oyo', type: 'College of Education', state: 'Oyo' },
  { name: 'Federal College of Education, Kontagora', shortName: 'FCE Kontagora', type: 'College of Education', state: 'Niger' },
  { name: 'Federal College of Education, Okene', shortName: 'FCE Okene', type: 'College of Education', state: 'Kogi' },
  { name: 'Federal College of Education, Pankshin', shortName: 'FCE Pankshin', type: 'College of Education', state: 'Plateau' },
  { name: 'Federal College of Education, Obudu', shortName: 'FCE Obudu', type: 'College of Education', state: 'Cross River' },
  { name: 'Federal College of Education, Katsina', shortName: 'FCE Katsina', type: 'College of Education', state: 'Katsina' },
  { name: 'Federal College of Education, Yola', shortName: 'FCE Yola', type: 'College of Education', state: 'Adamawa' },
  { name: 'Federal College of Education (Technical), Asaba', shortName: 'FCE Asaba', type: 'College of Education', state: 'Delta' },
  { name: 'Federal College of Education (Technical), Omoku', shortName: 'FCE Omoku', type: 'College of Education', state: 'Rivers' },
  { name: 'Nwafor Orizu College of Education, Nsugbe', shortName: 'NOCEN', type: 'College of Education', state: 'Anambra' },

  // Monotechnics & Specialized Institutes
  { name: 'Petroleum Training Institute, Effurun (PTI)', shortName: 'PTI Effurun', type: 'Monotechnic', state: 'Delta' },
  { name: 'Nigerian Institute of Journalism, Ogba (NIJ)', shortName: 'NIJ Lagos', type: 'Monotechnic', state: 'Lagos' },
  { name: 'Maritime Academy of Nigeria, Oron', shortName: 'MAN Oron', type: 'Monotechnic', state: 'Akwa Ibom' },
  { name: 'Federal College of Fisheries & Marine Technology, Lagos (FCFMT)', shortName: 'FCFMT', type: 'Monotechnic', state: 'Lagos' },
  { name: 'Federal College of Agriculture, Ibadan (FCAIB)', shortName: 'FCAIB', type: 'Monotechnic', state: 'Oyo' },
  { name: 'Federal Cooperative College, Ibadan / Oji River', shortName: 'FCC', type: 'Monotechnic', state: 'Oyo' },
  { name: 'Nigerian College of Aviation Technology, Zaria (NCAT)', shortName: 'NCAT Zaria', type: 'Monotechnic', state: 'Kaduna' },
  { name: 'Federal School of Surveying, Oyo (FSS)', shortName: 'FSS Oyo', type: 'Monotechnic', state: 'Oyo' },
  { name: 'School of Nursing / College of Nursing Sciences (General)', shortName: 'School of Nursing', type: 'Monotechnic', state: 'Lagos' },

  // Ghana
  { name: 'University of Ghana, Legon', shortName: 'UG Legon', type: 'University', state: 'Ghana', country: 'Ghana' },
  { name: 'Kwame Nkrumah University of Science and Technology (KNUST)', shortName: 'KNUST', type: 'University', state: 'Ghana', country: 'Ghana' },
  { name: 'University of Cape Coast', shortName: 'UCC', type: 'University', state: 'Ghana', country: 'Ghana' },
  { name: 'University for Development Studies, Tamale', shortName: 'UDS Tamale', type: 'University', state: 'Ghana', country: 'Ghana' },
  { name: 'Ghana Institute of Management and Public Administration (GIMPA)', shortName: 'GIMPA', type: 'University', state: 'Ghana', country: 'Ghana' },
  { name: 'Accra Technical University', shortName: 'ATU', type: 'Technical University', state: 'Ghana', country: 'Ghana' },
  { name: 'Ashesi University', shortName: 'Ashesi', type: 'Private University', state: 'Ghana', country: 'Ghana' },

  // Senegal
  { name: 'Cheikh Anta Diop University, Dakar', shortName: 'UCAD Dakar', type: 'University', state: 'Senegal', country: 'Senegal' },
  { name: 'Gaston Berger University, Saint-Louis', shortName: 'UGB Saint-Louis', type: 'University', state: 'Senegal', country: 'Senegal' },
  { name: 'Alioune Diop University, Bambey', shortName: 'UADB Bambey', type: 'University', state: 'Senegal', country: 'Senegal' },
  { name: 'Dakar American University of Science and Technology', shortName: 'DAUST', type: 'Private University', state: 'Senegal', country: 'Senegal' },

  // Ivory Coast (Côte d'Ivoire)
  { name: 'Université Félix Houphouët-Boigny, Abidjan', shortName: 'UFHB Abidjan', type: 'University', state: 'Ivory Coast', country: 'Ivory Coast' },
  { name: 'Université Nangui Abrogoua, Abidjan', shortName: 'UNA Abidjan', type: 'University', state: 'Ivory Coast', country: 'Ivory Coast' },
  { name: 'Université Alassane Ouattara, Bouaké', shortName: 'UAO Bouaké', type: 'University', state: 'Ivory Coast', country: 'Ivory Coast' },
  { name: 'Université Jean Lorougnon Guédé, Daloa', shortName: 'UJLoG Daloa', type: 'University', state: 'Ivory Coast', country: 'Ivory Coast' },

  // Mali
  { name: 'University of Bamako', shortName: 'Bamako', type: 'University', state: 'Mali', country: 'Mali' },
  { name: 'University of Ségou', shortName: 'Ségou', type: 'University', state: 'Mali', country: 'Mali' },
  { name: 'University of Social Sciences and Management of Bamako', shortName: 'USSGB Bamako', type: 'University', state: 'Mali', country: 'Mali' },

  // Burkina Faso
  { name: 'Joseph Ki-Zerbo University, Ouagadougou', shortName: 'UJKZ Ouagadougou', type: 'University', state: 'Burkina Faso', country: 'Burkina Faso' },
  { name: 'Nazi Boni University, Bobo-Dioulasso', shortName: 'UNB Bobo-Dioulasso', type: 'University', state: 'Burkina Faso', country: 'Burkina Faso' },
  { name: 'Thomas Sankara University', shortName: 'UTS', type: 'University', state: 'Burkina Faso', country: 'Burkina Faso' },

  // Niger
  { name: 'Abdou Moumouni University, Niamey', shortName: 'UAM Niamey', type: 'University', state: 'Niger Republic', country: 'Niger' },
  { name: 'University of Zinder', shortName: 'Zinder', type: 'University', state: 'Niger Republic', country: 'Niger' },
  { name: 'University of Maradi', shortName: 'UDM Maradi', type: 'University', state: 'Niger Republic', country: 'Niger' },

  // Togo
  { name: 'University of Lomé', shortName: 'UL Lomé', type: 'University', state: 'Togo', country: 'Togo' },
  { name: 'University of Kara', shortName: 'UK Kara', type: 'University', state: 'Togo', country: 'Togo' },

  // Benin
  { name: 'University of Abomey-Calavi', shortName: 'UAC Abomey-Calavi', type: 'University', state: 'Benin Republic', country: 'Benin' },
  { name: 'University of Parakou', shortName: 'UP Parakou', type: 'University', state: 'Benin Republic', country: 'Benin' },
  { name: 'National University of Agriculture', shortName: 'UNA Benin', type: 'University', state: 'Benin Republic', country: 'Benin' },

  // Sierra Leone
  { name: 'Fourah Bay College, University of Sierra Leone', shortName: 'FBC USL', type: 'University', state: 'Sierra Leone', country: 'Sierra Leone' },
  { name: 'Njala University', shortName: 'Njala', type: 'University', state: 'Sierra Leone', country: 'Sierra Leone' },
  { name: 'Ernest Bai Koroma University', shortName: 'EBKUST', type: 'University', state: 'Sierra Leone', country: 'Sierra Leone' },

  // Liberia
  { name: 'University of Liberia, Monrovia', shortName: 'UL Monrovia', type: 'University', state: 'Liberia', country: 'Liberia' },
  { name: 'Cuttington University', shortName: 'Cuttington', type: 'Private University', state: 'Liberia', country: 'Liberia' },
  { name: 'African Methodist Episcopal University', shortName: 'AMEU', type: 'Private University', state: 'Liberia', country: 'Liberia' },

  // Guinea
  { name: 'Gamal Abdel Nasser University, Conakry', shortName: 'UGANC Conakry', type: 'University', state: 'Guinea', country: 'Guinea' },
  { name: 'University of Kankan', shortName: 'UJK Kankan', type: 'University', state: 'Guinea', country: 'Guinea' },
  { name: 'University of Labé', shortName: 'Labé', type: 'University', state: 'Guinea', country: 'Guinea' },

  // Gambia
  { name: 'University of The Gambia', shortName: 'UTG', type: 'University', state: 'Gambia', country: 'Gambia' },
  { name: 'Gambia Technical Training Institute', shortName: 'GTTI', type: 'Technical University', state: 'Gambia', country: 'Gambia' },

  // Cape Verde
  { name: 'University of Cape Verde, Praia', shortName: 'Uni-CV Praia', type: 'University', state: 'Cape Verde', country: 'Cape Verde' },
  { name: 'Jean Piaget University of Cape Verde', shortName: 'UniPiaget CV', type: 'Private University', state: 'Cape Verde', country: 'Cape Verde' },

  // Guinea-Bissau
  { name: 'Amílcar Cabral University, Bissau', shortName: 'UAC Bissau', type: 'University', state: 'Guinea-Bissau', country: 'Guinea-Bissau' },
  { name: 'Lusophone University of Guinea', shortName: 'ULG', type: 'Private University', state: 'Guinea-Bissau', country: 'Guinea-Bissau' },

  // South Africa
  { name: 'University of Cape Town', shortName: 'UCT', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of Johannesburg', shortName: 'UJ', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of Pretoria', shortName: 'UP Pretoria', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of the Witwatersrand (Wits)', shortName: 'Wits', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'Stellenbosch University', shortName: 'Stellenbosch', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of KwaZulu-Natal, Durban', shortName: 'UKZN', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of South Africa (UNISA)', shortName: 'UNISA', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'Nelson Mandela University', shortName: 'NMU', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'Rhodes University', shortName: 'Rhodes', type: 'University', state: 'South Africa', country: 'South Africa' },
  { name: 'University of the Western Cape', shortName: 'UWC', type: 'University', state: 'South Africa', country: 'South Africa' },
];

export function getInstitutionsByCountry(countryName?: string): InstitutionOption[] {
  if (!countryName || countryName === 'All') return NIGERIAN_INSTITUTIONS;
  const clean = countryName.trim().toLowerCase();
  const matched = NIGERIAN_INSTITUTIONS.filter((i) => {
    const instCountry = (i.country || 'Nigeria').toLowerCase();
    return instCountry === clean;
  });
  return matched;
}

