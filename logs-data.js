// The expandable tiles and their items. Used by both the website and the server.
// Each item is [name, image]; the image is its address on the Old School RuneScape Wiki.
// An item's position here is how its cross is saved, so don't rearrange items during an event.
(function () {
  const item = (name, image) => [name, image];
  const copies = (name, image, count) =>
    Array.from({ length: count }, (_, i) => item(name + ' ' + (i + 1), image));
  const barrows = (brother, pieces) => ({
    heading: brother + "'s",
    items: pieces.map(([piece, tag]) => item(brother + "'s " + piece, brother + '%27s_' + piece + '.png?' + tag)),
  });

  const LOGS = {
    2: { name: 'Scurrius Spines', groups: [{ items: copies("Scurrius' spine", 'Scurrius%27_spine.png?a2a6a', 5) }] },
    5: { name: 'Pyromancer', groups: [{ items: [
      item('Pyromancer hood', 'Pyromancer_hood.png?3a750'),
      item('Pyromancer garb', 'Pyromancer_garb.png?9a45f'),
      item('Pyromancer robe', 'Pyromancer_robe.png?9a45f'),
      item('Pyromancer boots', 'Pyromancer_boots.png?ed4b0'),
    ] }] },
    6: { name: 'Barrows', groups: [
      barrows('Ahrim', [['hood', '8d9e1'], ['robetop', '248b4'], ['robeskirt', '65d4f'], ['staff', '248b4']]),
      barrows('Dharok', [['helm', '3043c'], ['platebody', '4806b'], ['platelegs', '2c9d4'], ['greataxe', '3043c']]),
      barrows('Guthan', [['helm', 'e75c0'], ['platebody', '06911'], ['chainskirt', 'd316a'], ['warspear', '06911']]),
      barrows('Karil', [['coif', '49f5e'], ['leathertop', '6d393'], ['leatherskirt', '49f5e'], ['crossbow', '49f5e']]),
      barrows('Torag', [['helm', 'c9227'], ['platebody', '04f28'], ['platelegs', '9e8ff'], ['hammers', 'c9227']]),
      barrows('Verac', [['helm', 'e3acf'], ['brassard', 'e3acf'], ['plateskirt', '4afbb'], ['flail', 'f4ddf']]),
    ] },
    10: { name: 'Twinflame Staff', groups: [{ items: [
      item('Fire element staff crown', 'Fire_element_staff_crown.png?12e98'),
      item('Ice element staff crown', 'Ice_element_staff_crown.png?12e98'),
    ] }] },
    11: { name: 'Blood Moon', groups: [{ items: [
      item('Blood Moon helm', 'Blood_Moon_helm.png?07650'),
      item('Blood Moon chestplate', 'Blood_Moon_chestplate.png?e1669'),
      item('Blood Moon tassets', 'Blood_Moon_tassets.png?07650'),
      item('Dual macuahuitl', 'Dual_macuahuitl.png?77621'),
    ] }] },
    14: { name: 'DK Rings', groups: [{ items: [
      item('Warrior ring', 'Warrior_ring.png?75a26'),
      item('Berserker ring', 'Berserker_ring.png?3be33'),
      item('Archers ring', 'Archers_ring.png?c0a17'),
      item('Seers ring', 'Seers_ring.png?4b960'),
    ] }] },
    15: { name: 'Zenyte Shards', groups: [{ items: copies('Zenyte shard', 'Zenyte_shard.png?8abb8', 2) }] },
    17: { name: 'Burning Claws', groups: [{ items: copies('Burning claw', 'Burning_claw.png?758f6', 2) }] },
    20: { name: 'Zulrah Uniques', groups: [{ items: [
      item('Tanzanite fang', 'Tanzanite_fang.png?57bdc'),
      item('Magic fang', 'Magic_fang.png?ed6d0'),
      item('Serpentine visage', 'Serpentine_visage.png?c943f'),
      item('Tanzanite mutagen', 'Tanzanite_mutagen.png?62c54'),
      item('Magma mutagen', 'Magma_mutagen.png?ed6d0'),
    ] }] },
    23: { name: 'Venator Bow', groups: [{ items: copies('Venator shard', 'Venator_shard.png?6600c', 5) }] },
    27: { name: 'Sunfire', groups: [{ items: [
      item('Sunfire fanatic helm', 'Sunfire_fanatic_helm.png?16f54'),
      item('Sunfire fanatic cuirass', 'Sunfire_fanatic_cuirass.png?16f54'),
      item('Sunfire fanatic chausses', 'Sunfire_fanatic_chausses.png?16a51'),
    ] }] },
    29: { name: 'Yama Uniques', groups: [{ items: [
      item('Soulflame horn', 'Soulflame_horn.png?773dd'),
      item('Oathplate helm', 'Oathplate_helm.png?e3d92'),
      item('Oathplate chest', 'Oathplate_chest.png?e3d92'),
      item('Oathplate legs', 'Oathplate_legs.png?045b8'),
    ] }] },
    31: { name: 'Doom Uniques', groups: [{ items: [
      item('Mokhaiotl cloth', 'Mokhaiotl_cloth.png?ca973'),
      item('Eye of Ayak', 'Eye_of_Ayak_%28uncharged%29.png?bf437'),
      item('Avernic treads', 'Avernic_treads.png?fba52'),
    ] }] },
    32: { name: 'Raid Armour', groups: [
      { heading: 'Chambers of Xeric', items: [
        item('Ancestral hat', 'Ancestral_hat.png?ec289'),
        item('Ancestral robe top', 'Ancestral_robe_top.png?8d9e1'),
        item('Ancestral robe bottom', 'Ancestral_robe_bottom.png?15de7'),
        item('Twisted buckler', 'Twisted_buckler.png?5c5a6'),
        item("Dinh's bulwark", 'Dinh%27s_bulwark.png?2c9d4'),
      ] },
      { heading: 'Theatre of Blood', items: [
        item('Justiciar faceguard', 'Justiciar_faceguard.png?fb842'),
        item('Justiciar chestguard', 'Justiciar_chestguard.png?fb842'),
        item('Justiciar legguards', 'Justiciar_legguards.png?cff7a'),
        item('Avernic defender hilt', 'Avernic_defender_hilt.png?2baad'),
      ] },
      { heading: 'Tombs of Amascut', items: [
        item('Masori mask', 'Masori_mask.png?44891'),
        item('Masori body', 'Masori_body.png?44891'),
        item('Masori chaps', 'Masori_chaps.png?44891'),
        item("Elidinis' ward", 'Elidinis%27_ward.png?a2353'),
      ] },
    ] },
    34: { name: 'Raid Weapons', groups: [
      { heading: 'Chambers of Xeric', items: [
        item('Dragon claws', 'Dragon_claws.png?c85b3'),
        item('Elder maul', 'Elder_maul.png?0a875'),
        item('Dragon hunter crossbow', 'Dragon_hunter_crossbow.png?cc5f3'),
        item('Twisted bow', 'Twisted_bow.png?08f42'),
        item('Kodai insignia', 'Kodai_insignia.png?ec129'),
      ] },
      { heading: 'Theatre of Blood', items: [
        item('Ghrazi rapier', 'Ghrazi_rapier.png?d2266'),
        item('Sanguinesti staff', 'Sanguinesti_staff_%28uncharged%29.png?dcaa9'),
        item('Scythe of Vitur', 'Scythe_of_Vitur_%28uncharged%29.png?c82f9'),
      ] },
      { heading: 'Tombs of Amascut', items: [
        item("Osmumten's fang", 'Osmumten%27s_fang.png?8bfab'),
        item("Tumeken's shadow", 'Tumeken%27s_shadow.png?3169b'),
      ] },
    ] },
    // Boss pictures are large renders rather than pixel icons
    35: { name: 'Awakened Bosses', smooth: true, groups: [{ items: [
      item('Duke Sucellus', 'thumb/Duke_Sucellus.png/280px-Duke_Sucellus.png?d588a'),
      item('The Leviathan', 'thumb/The_Leviathan.png/280px-The_Leviathan.png?d588a'),
      item('The Whisperer', 'thumb/The_Whisperer.png/120px-The_Whisperer.png?aedab'),
      item('Vardorvis', 'thumb/Vardorvis.png/200px-Vardorvis.png?48af8'),
    ] }] },
  };

  if (typeof module !== 'undefined') module.exports = LOGS;
  else window.LOGS = LOGS;
})();
