// migrations/create-homepage.js
module.exports = function (migration) {
    // BUTTON_VOD
    const buttonVod = migration
      .createContentType('button_vod')
      .name('Button_vod')
      .description('Button configuration');
    buttonVod.createField('title').name('CTA text').type('Symbol').required(true);
    buttonVod.createField('backgroundColor').name('CTA background color').type('Symbol');
    buttonVod.createField('textColor').name('CTA text color').type('Symbol');
    buttonVod.createField('url').name('CTA url').type('Symbol');
    buttonVod.displayField('title');
  
    // HERO_VOD
    const heroVod = migration
      .createContentType('hero_vod')
      .name('Hero_vod')
      .description('Hero for VOD');
    heroVod.createField('title').name('Entry title').type('Symbol').required(true);
    heroVod.createField('subtitle').name('Subtitle').type('Text');
    heroVod.createField('eyebrow').name('Eyebrow').type('Symbol');
    heroVod.createField('backgroundImage').name('Background Image').type('Link').linkType('Asset');
    heroVod
      .createField('button')
      .name('Button_vod')
      .type('Link')
      .linkType('Entry')
      .validations([{ linkContentType: ['button_vod'] }]);
    heroVod.displayField('title');
  
    // ICON_VOD
    const iconVod = migration
      .createContentType('icon_vod')
      .name('Icon_vod')
      .description('Icon block');
    iconVod.createField('title').name('Icon text').type('Symbol').required(true);
    iconVod.createField('textColor').name('Icon text color').type('Symbol');
    iconVod.createField('image').name('Icon image').type('Link').linkType('Asset');
    iconVod.createField('backgroundColor').name('Icon bg color').type('Symbol');
    iconVod.displayField('title');
  
    // STRIP_VOD
    const stripVod = migration
      .createContentType('strip_vod')
      .name('Strip_vod')
      .description('Strip/banner for VOD');
    stripVod.createField('title').name('Strip text').type('Symbol').required(true);
    stripVod.createField('color').name('Strip color').type('Symbol');
    stripVod
      .createField('button')
      .name('Button_vod')
      .type('Link')
      .linkType('Entry')
      .validations([{ linkContentType: ['button_vod'] }]);
    stripVod.displayField('title');
  
    // FOOTER LINK (helper for Footer_vod)
    const footerLinkVod = migration
      .createContentType('footerLink_vod')
      .name('Footer Link VOD')
      .description('Footer link item');
    footerLinkVod.createField('label').name('Label').type('Symbol').required(true);
    footerLinkVod.createField('url').name('URL').type('Symbol').required(true);
    footerLinkVod.createField('group').name('Group').type('Symbol'); // e.g., Company/Resources/Legal
    footerLinkVod.displayField('label');
  
    // FOOTER_VOD (similar to current footer)
    const footerVod = migration
      .createContentType('footer_vod')
      .name('Footer_vod')
      .description('Footer for VOD');
    footerVod
      .createField('links')
      .name('Links')
      .type('Array')
      .items({
        type: 'Link',
        linkType: 'Entry',
        validations: [{ linkContentType: ['footerLink_vod'] }],
      });
    footerVod.createField('socialLinks').name('Social Links').type('Object'); // e.g., [{label,url,icon}]
    footerVod.createField('legalText').name('Legal Text').type('Text');
    footerVod.displayField('legalText');
  };