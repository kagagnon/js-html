const deepExtend = require( 'deep-extend' );

function Buffer( Template ){
    this.Template = Template;
    this.sections = {};
    this.global_buffer = [];

    this.current_buffer = [];

    this.extending_view = null;
}

Buffer.prototype.push = function( html ){
    if( this.current_buffer.length == 0 ){
        this.global_buffer.push( html );
    }else{
        let last_buffer = this.current_buffer[ this.current_buffer.length - 1 ];

        if( typeof this.sections[ last_buffer ] == 'undefined' ){
            this.sections[ last_buffer ] = [];
        }

        this.sections[ last_buffer ].push( html );
    }
}

Buffer.prototype.startSection = function( section_name ){
    this.current_buffer.push( section_name );
}

Buffer.prototype.endSection = function(){
    this.current_buffer.pop();
}

Buffer.prototype.setExtend = function( view_name, Data = {} ){
    this.extending_view = { name : view_name, data : Data };
}

Buffer.prototype.echo = function( section = false, Data ){
    if( section ){
        if( Array.isArray( this.sections[ section ] ) ){
            return this.sections[ section ].join( "\n" );
        }else{
            return '';
        }
    }

    if( this.extending_view ){
        let view = this.extending_view.name;
        deepExtend( Data, this.extending_view.data );
        this.extending_view = null;
        return this.Template.new( view, Data, this ).render();
    }

    return this.global_buffer.join( "\n" );
}

module.exports = Buffer;
